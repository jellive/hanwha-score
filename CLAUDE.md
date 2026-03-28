# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) that shows real-time KBO Hanwha Eagles game scores on the browser badge and sends desktop notifications on score changes. Pure JavaScript with ES modules, no build tools or framework.

- **Data source**: Naver Sports API (`api-gw.sports.naver.com`) — no auth required
- **PRD**: `docs/PRD-hanwha-score.md` — contains full API response schemas, polling strategy, and UI wireframes

## Architecture

```
Service Worker (background.js)
  ├── Polling loop via chrome.alarms (1min during game, 10min pre-game, off at night)
  ├── api.js          — fetch game list + game detail from Naver Sports API
  ├── badge.js        — setBadgeText/Color (hanwha score always left)
  ├── notifications.js — chrome.notifications for score/start/end events
  ├── storage.js      — chrome.storage.sync (settings) + local (last score state)
  └── constants.js    — KBO team codes, colors, MY_TEAM_CODE='HH'

Popup (popup.html/js/css)
  └── Scoreboard UI: inning-by-inning scores, team logos, game status

Options (options.html/js/css)
  └── Notification toggle settings (stored in chrome.storage.sync)
```

The background service worker is the core — it drives polling, badge updates, and notifications. Popup and options pages are stateless views that read from storage/API on open.

## Key Domain Concepts

- **Team code `HH`**: Hanwha Eagles identifier in Naver API. `findHanwhaGame()` filters by this.
- **statusCode**: `BEFORE` | `STARTED` | `RESULT` — drives polling frequency and badge behavior.
- **Score format**: Always `"{hanwha}:{opponent}"` regardless of home/away. The `isHome` check normalizes this.
- **Badge color**: `#F37321` (Hanwha orange) when winning/tied, `#888888` (gray) when losing.

## Development Commands

No build step. Load directly in Chrome:

```bash
# Load as unpacked extension
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → select this project root

# After code changes, click the reload button on the extension card
```

## Testing

Chrome extension APIs (`chrome.alarms`, `chrome.notifications`, `chrome.storage`, `chrome.action`) are not available in Node.js. Testing strategy:

- **Service worker debug**: `chrome://extensions` → extension card → "Inspect views: service worker"
- **API module**: Can be tested with a simple Node.js script since `api.js` only uses `fetch()`
- **Manual verification checklist**: See PRD Section 9 for the full test matrix

## API Endpoints

```
# Today's KBO games (returns all 5 games)
GET https://api-gw.sports.naver.com/schedule/games?fields=basic&date={YYYY-MM-DD}&upperCategoryId=kbaseball&categoryId=kbo

# Single game detail (inning-by-inning scores)
GET https://api-gw.sports.naver.com/schedule/games/{gameId}

# Team logo
https://sports-phinf.pstatic.net/team/kbo/default/{teamCode}.png
```

## Polling Strategy

| State                             | Interval   | What to call                 |
| --------------------------------- | ---------- | ---------------------------- |
| Night (00:00-11:00)               | No polling | Skip entirely                |
| Pre-game (11:00-start)            | 10 min     | Game list API only           |
| Playing (`STARTED`)               | 1 min      | Game list + detail API       |
| Post-game (30 min after `RESULT`) | No polling | Keep final score, then clear |

`chrome.alarms.periodInMinutes` minimum is 1 minute in Manifest V3.

## Important Constraints

- **Manifest V3**: Service workers are ephemeral — state must persist via `chrome.storage`. No `setInterval`.
- **Naver API is unofficial**: No rate limit docs. Keep polling conservative (1min max during games).
- **host_permissions required**: `https://api-gw.sports.naver.com/*` and `https://sports-phinf.pstatic.net/*` for API and logos.
