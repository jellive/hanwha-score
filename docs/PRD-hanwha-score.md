# 🦅 한화 스코어 알림 — 크롬 확장 프로그램 PRD v1.1

> KBO 한화 이글스 경기 실시간 스코어를 크롬 뱃지로 알려주는 확장 프로그램.
> 주말 하루 사이즈 프로젝트.

---

## 1. 개요

한화 이글스 경기가 진행 중일 때 크롬 확장 아이콘 뱃지에 실시간 스코어를 표시하고, 점수 변동 시 데스크탑 알림을 보내는 확장 프로그램.

**핵심 가치**: 코딩하면서, 일하면서 탭 안 열고도 한화 경기 상황을 한눈에.

---

## 2. 데이터 소스 (검증 완료)

### 네이버 스포츠 API (Primary — 2026-03-28 검증 완료)

#### 2-1. 당일 전체 KBO 경기 목록

```
GET https://api-gw.sports.naver.com/schedule/games
  ?fields=basic
  &date=2026-03-28
  &upperCategoryId=kbaseball
  &categoryId=kbo
```

**응답 구조** (핵심 필드):

```jsonc
{
  "code": 200,
  "success": true,
  "result": {
    "games": [
      {
        "gameId": "20260328WOHH02026", // 경기 고유 ID
        "categoryId": "kbo",
        "gameDate": "2026-03-28",
        "gameDateTime": "2026-03-28T14:00:00",
        "homeTeamCode": "HH", // 팀 코드
        "homeTeamName": "한화", // 팀 이름
        "awayTeamCode": "WO",
        "awayTeamName": "키움",
        "homeTeamScore": 0, // 현재 스코어
        "awayTeamScore": 0,
        "statusCode": "BEFORE", // BEFORE | PLAYING | RESULT
        "statusInfo": "경기전", // "경기전" | "5회초" | "경기종료"
        "homeTeamEmblemUrl": "https://sports-phinf.pstatic.net/team/kbo/default/HH.png",
        "awayTeamEmblemUrl": "https://sports-phinf.pstatic.net/team/kbo/default/WO.png",
        "cancel": false, // 우천취소 등
        "reversedHomeAway": true, // 원정팀이 먼저 표시되는지
      },
      // ... 총 5경기
    ],
    "gameTotalCount": 5,
  },
}
```

**statusCode 값**:
| 값 | 의미 | 뱃지 동작 |
|----|------|----------|
| `BEFORE` | 경기 전 | 뱃지 없음 또는 시작 시간 표시 |
| `PLAYING` | 경기 중 | 실시간 스코어 표시 |
| `RESULT` | 경기 종료 | 최종 스코어 유지 → 일정 시간 후 제거 |

#### 2-2. 개별 경기 상세 (이닝별 스코어보드)

```
GET https://api-gw.sports.naver.com/schedule/games/{gameId}
```

**응답 구조** (핵심 필드):

```jsonc
{
  "code": 200,
  "result": {
    "game": {
      "gameId": "20260328WOHH02026",
      "stadium": "대전", // 구장
      "currentInning": "", // "5회초", "7회말" 등
      "homeTeamScoreByInning": ["-", "-", "-", "-", "-", "-", "-", "-", "-"],
      "awayTeamScoreByInning": ["-", "-", "-", "-", "-", "-", "-", "-", "-"],
      "homeTeamRheb": [], // [R, H, E, B]
      "awayTeamRheb": [],
      "homeStarterName": "에르난데스", // 선발 투수
      "awayStarterName": "알칸타라",
      "homeCurrentPitcherName": null, // 현재 투수
      "awayCurrentPitcherName": null,
      "winPitcherName": "", // 승리 투수
      "losePitcherName": "",
      "broadChannel": "MBC SPORTS+^SPOTV2", // 중계 채널
      "weatherInfo": {
        "weather": "14.7° 맑음",
        "dongCode": "07140111",
      },
      "homeTeamFullName": "한화 이글스",
      "awayTeamFullName": "키움 히어로즈",
      "homeTeamEmblemUrl": "https://sports-phinf.pstatic.net/team/kbo/default/HH.png",
      "awayTeamEmblemUrl": "https://sports-phinf.pstatic.net/team/kbo/default/WO.png",
    },
  },
}
```

#### 2-3. 팀 로고

```
https://sports-phinf.pstatic.net/team/kbo/default/{teamCode}.png
```

- 별도 인증 불필요
- 크롬 확장에서 `host_permissions`로 접근
- API 응답의 `homeTeamEmblemUrl` / `awayTeamEmblemUrl` 그대로 사용

#### 2-4. 폴링 전략

| 상태                         | 주기       | 방법                          |
| ---------------------------- | ---------- | ----------------------------- |
| 경기 없는 시간 (00:00~12:00) | 폴링 안 함 | `chrome.alarms` 비활성        |
| 경기 예정 (12:00~경기시작)   | 10분       | 경기 목록 API만 호출          |
| 경기 중 (`PLAYING`)          | 1분        | 경기 목록 + 상세 API 호출     |
| 경기 종료 후 30분            | 폴링 안 함 | 최종 스코어 유지 후 뱃지 제거 |

> `chrome.alarms`의 `periodInMinutes` 최솟값은 1분 (Manifest V3).
> 30초 간격은 불가하지만, 야구 경기에서 1분이면 충분.

---

## 3. 기능

### 3-1. 뱃지 스코어 표시

| 상태           | 뱃지 텍스트 | 뱃지 배경색           |
| -------------- | ----------- | --------------------- |
| 한화 이기는 중 | `"3:1"`     | `#F37321` (한화 주황) |
| 한화 지는 중   | `"1:3"`     | `#888888` (회색)      |
| 동점           | `"2:2"`     | `#F37321` (한화 주황) |
| 경기 전        | `""` (없음) | —                     |
| 경기 없는 날   | `""` (없음) | —                     |

뱃지 텍스트 형식: `"{한화점수}:{상대점수}"` — 항상 한화가 왼쪽.

### 3-2. 데스크탑 알림

| 이벤트    | 알림 제목      | 알림 내용            | 아이콘      |
| --------- | -------------- | -------------------- | ----------- |
| 한화 득점 | 🦅 한화 득점!  | `3:2 (5회초)`        | 한화 로고   |
| 한화 실점 | 한화 실점      | `3:4 (7회말)`        | 상대팀 로고 |
| 경기 시작 | 오늘 한화 경기 | `vs 키움 14:00 대전` | 한화 로고   |
| 한화 승리 | 🎉 한화 승리!  | `5:3 vs 키움`        | 한화 로고   |
| 한화 패배 | 한화 패배      | `3:5 vs 키움`        | 상대팀 로고 |

### 3-3. 팝업 UI (아이콘 클릭 시)

**경기 중**:

```
┌──────────────────────────────────┐
│     대전 | 14:00 | 5회 초  🟢     │
│     14.7° 맑음  MBC SPORTS+      │
│                                  │
│  [한화🟠]  한화   3 : 1  키움  [키움] │
│                                  │
│  선발: 에르난데스 vs 알칸타라      │
│                                  │
│  ┌──┬──┬──┬──┬──┬──┬──┬──┬──┐  R│
│  │1 │2 │3 │4 │5 │6 │7 │8 │9 │   │
│  ├──┼──┼──┼──┼──┼──┼──┼──┼──┤   │
│  │0 │1 │0 │2 │0 │- │- │- │- │ 3 │ 한화
│  │1 │0 │0 │0 │0 │- │- │- │- │ 1 │ 키움
│  └──┴──┴──┴──┴──┴──┴──┴──┴──┘   │
│                                  │
│  ⚙️ 설정                         │
└──────────────────────────────────┘
```

**경기 없는 날**:

```
┌──────────────────────────────────┐
│       오늘 경기 없음 🏖️          │
│                                  │
│  다음 경기                        │
│  [한화🟠] 한화 vs 삼성 [삼성🔵]    │
│  3/30(일) 14:00 대전              │
│                                  │
│  ⚙️ 설정                         │
└──────────────────────────────────┘
```

- 팀 로고: API 응답의 `emblemUrl` 직접 사용 (40x40px)
- 이기는 팀 스코어: bold + 팀 컬러
- 지는 팀 스코어: 회색
- 경기 상태 인디케이터: 🟢 진행중, ⚪ 경기전, 🔴 종료

### 3-4. 설정 (옵션 페이지)

| 설정 항목      | 기본값 | 설명                   |
| -------------- | ------ | ---------------------- |
| 알림 ON/OFF    | ON     | 모든 알림 토글         |
| 득점 알림      | ON     | 한화 득점 시 알림      |
| 실점 알림      | OFF    | 한화 실점 시 알림      |
| 경기 시작 알림 | ON     | 경기 시작 30분 전 알림 |
| 경기 종료 알림 | ON     | 경기 끝났을 때 알림    |

`chrome.storage.sync`에 저장 — 브라우저 간 동기화.

---

## 4. 기술 구조

### Manifest V3

```json
{
  "manifest_version": 3,
  "name": "한화 스코어 알림",
  "version": "1.0.0",
  "description": "KBO 한화 이글스 실시간 스코어를 뱃지로 확인하세요 🦅",
  "permissions": ["alarms", "notifications", "storage"],
  "host_permissions": [
    "https://api-gw.sports.naver.com/*",
    "https://sports-phinf.pstatic.net/*"
  ],
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 파일 구조

```
hanwha-score/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── options.html
├── options.css
├── options.js
├── src/
│   ├── background.js        — 메인 Service Worker (폴링 + 뱃지 + 알림)
│   ├── api.js               — 네이버 스포츠 API 호출 + 파싱
│   ├── badge.js             — 뱃지 텍스트/색상 업데이트
│   ├── notifications.js     — 데스크탑 알림 관리
│   ├── storage.js           — chrome.storage 헬퍼
│   └── constants.js         — 팀 코드/컬러 매핑
├── icons/
│   ├── icon16.png           — 확장 아이콘 (한화 이글스 스타일)
│   ├── icon48.png
│   └── icon128.png
└── docs/
    └── PRD-hanwha-score.md  — 이 문서
```

### background.js 핵심 로직

```javascript
import { fetchTodayGames, fetchGameDetail } from "./api.js";
import { updateBadge, clearBadge } from "./badge.js";
import {
  sendScoreNotification,
  sendGameStartNotification,
  sendGameEndNotification,
} from "./notifications.js";
import {
  getSettings,
  getLastScore,
  setLastScore,
  setLastGameData,
} from "./storage.js";

const ALARM_CHECK = "checkScore";
const ALARM_PREGAME = "preGameCheck";

// Service Worker 설치 시 알람 등록
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_CHECK, { periodInMinutes: 1 });
});

// SW 재시작 시에도 알람 보장
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_CHECK, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_CHECK) {
    await checkAndUpdate();
  }
});

async function checkAndUpdate() {
  const now = new Date();
  const hour = now.getHours();

  // 새벽 0시~11시: 폴링 스킵
  if (hour < 11) {
    clearBadge();
    return;
  }

  const games = await fetchTodayGames();
  const hanwhaGame = findHanwhaGame(games);

  if (!hanwhaGame) {
    clearBadge();
    return;
  }

  if (hanwhaGame.statusCode === "BEFORE") {
    clearBadge();
    await checkPreGameNotification(hanwhaGame);
    return;
  }

  if (hanwhaGame.statusCode === "PLAYING") {
    const detail = await fetchGameDetail(hanwhaGame.gameId);
    updateBadge(hanwhaGame);
    await checkScoreChange(hanwhaGame, detail);
    await setLastGameData(detail);
    return;
  }

  if (hanwhaGame.statusCode === "RESULT") {
    updateBadge(hanwhaGame);
    await checkGameEnd(hanwhaGame);
  }
}

function findHanwhaGame(games) {
  return games.find((g) => g.homeTeamCode === "HH" || g.awayTeamCode === "HH");
}

function getHanwhaScore(game) {
  const isHome = game.homeTeamCode === "HH";
  return {
    hanwha: isHome ? game.homeTeamScore : game.awayTeamScore,
    opponent: isHome ? game.awayTeamScore : game.homeTeamScore,
    opponentName: isHome ? game.awayTeamName : game.homeTeamName,
    opponentLogo: isHome ? game.awayTeamEmblemUrl : game.homeTeamEmblemUrl,
    hanwhaLogo: isHome ? game.homeTeamEmblemUrl : game.awayTeamEmblemUrl,
  };
}

async function checkScoreChange(game, detail) {
  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;

  const prev = await getLastScore();
  const scores = getHanwhaScore(game);
  const currentKey = `${scores.hanwha}:${scores.opponent}`;

  if (!prev || prev === currentKey) {
    await setLastScore(currentKey);
    return;
  }

  const [prevH, prevO] = prev.split(":").map(Number);
  const inning = detail?.game?.currentInning || game.statusInfo;

  if (scores.hanwha > prevH && settings.notifyOnScore) {
    sendScoreNotification({
      title: "🦅 한화 득점!",
      message: `${scores.hanwha}:${scores.opponent} (${inning})`,
      iconUrl: scores.hanwhaLogo,
    });
  }

  if (scores.opponent > prevO && settings.notifyOnConcede) {
    sendScoreNotification({
      title: "한화 실점",
      message: `${scores.hanwha}:${scores.opponent} (${inning})`,
      iconUrl: scores.opponentLogo,
    });
  }

  await setLastScore(currentKey);
}

async function checkGameEnd(game) {
  const lastData = await chrome.storage.local.get("gameEnded");
  if (lastData.gameEnded === game.gameId) return;

  const settings = await getSettings();
  if (!settings.notifyOnEnd) return;

  const scores = getHanwhaScore(game);
  const won = scores.hanwha > scores.opponent;

  sendGameEndNotification({
    title: won ? "🎉 한화 승리!" : "한화 패배",
    message: `${scores.hanwha}:${scores.opponent} vs ${scores.opponentName}`,
    iconUrl: won ? scores.hanwhaLogo : scores.opponentLogo,
  });

  await chrome.storage.local.set({ gameEnded: game.gameId });
}

async function checkPreGameNotification(game) {
  const settings = await getSettings();
  if (!settings.notifyOnStart) return;

  const gameTime = new Date(game.gameDateTime);
  const now = new Date();
  const diffMin = (gameTime - now) / 60000;

  if (diffMin > 0 && diffMin <= 30) {
    const lastNotified = await chrome.storage.local.get("preGameNotified");
    if (lastNotified.preGameNotified === game.gameId) return;

    const scores = getHanwhaScore(game);
    const time = gameTime.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    sendGameStartNotification({
      title: "오늘 한화 경기",
      message: `vs ${scores.opponentName} ${time} ${game.stadium || ""}`,
      iconUrl: scores.hanwhaLogo,
    });

    await chrome.storage.local.set({ preGameNotified: game.gameId });
  }
}
```

### api.js

```javascript
const BASE_URL = "https://api-gw.sports.naver.com";

export async function fetchTodayGames() {
  const today = formatDate(new Date());
  const url = `${BASE_URL}/schedule/games?fields=basic&date=${today}&upperCategoryId=kbaseball&categoryId=kbo`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.result?.games || [];
  } catch {
    return [];
  }
}

export async function fetchGameDetail(gameId) {
  const url = `${BASE_URL}/schedule/games/${gameId}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
```

### badge.js

```javascript
const HANWHA_ORANGE = "#F37321";
const LOSING_GRAY = "#888888";

export function updateBadge(game) {
  const isHome = game.homeTeamCode === "HH";
  const hanwhaScore = isHome ? game.homeTeamScore : game.awayTeamScore;
  const opponentScore = isHome ? game.awayTeamScore : game.homeTeamScore;

  const text = `${hanwhaScore}:${opponentScore}`;
  const isWinning = hanwhaScore >= opponentScore;

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({
    color: isWinning ? HANWHA_ORANGE : LOSING_GRAY,
  });
  chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
}

export function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}
```

### constants.js

```javascript
export const KBO_TEAMS = {
  HH: { name: "한화", fullName: "한화 이글스", color: "#F37321" },
  LT: { name: "롯데", fullName: "롯데 자이언츠", color: "#041E42" },
  SS: { name: "삼성", fullName: "삼성 라이온즈", color: "#074CA1" },
  OB: { name: "두산", fullName: "두산 베어스", color: "#131230" },
  HT: { name: "KIA", fullName: "KIA 타이거즈", color: "#EA0029" },
  SK: { name: "SSG", fullName: "SSG 랜더스", color: "#CE0E2D" },
  LG: { name: "LG", fullName: "LG 트윈스", color: "#C30452" },
  NC: { name: "NC", fullName: "NC 다이노스", color: "#315288" },
  WO: { name: "키움", fullName: "키움 히어로즈", color: "#820024" },
  KT: { name: "KT", fullName: "KT 위즈", color: "#000000" },
};

export const MY_TEAM_CODE = "HH";
```

### storage.js

```javascript
const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  notifyOnScore: true,
  notifyOnConcede: false,
  notifyOnStart: true,
  notifyOnEnd: true,
};

export async function getSettings() {
  const data = await chrome.storage.sync.get("settings");
  return { ...DEFAULT_SETTINGS, ...data.settings };
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set({ settings });
}

export async function getLastScore() {
  const data = await chrome.storage.local.get("lastScore");
  return data.lastScore || null;
}

export async function setLastScore(score) {
  await chrome.storage.local.set({ lastScore: score });
}

export async function setLastGameData(detail) {
  await chrome.storage.local.set({ lastGameData: detail });
}
```

### notifications.js

```javascript
export function sendScoreNotification({ title, message, iconUrl }) {
  chrome.notifications.create(`score-${Date.now()}`, {
    type: "basic",
    iconUrl: iconUrl || "icons/icon128.png",
    title,
    message,
    priority: 2,
    requireInteraction: false,
  });
}

export function sendGameStartNotification({ title, message, iconUrl }) {
  chrome.notifications.create("game-start", {
    type: "basic",
    iconUrl: iconUrl || "icons/icon128.png",
    title,
    message,
    priority: 1,
  });
}

export function sendGameEndNotification({ title, message, iconUrl }) {
  chrome.notifications.create("game-end", {
    type: "basic",
    iconUrl: iconUrl || "icons/icon128.png",
    title,
    message,
    priority: 2,
    requireInteraction: true,
  });
}
```

---

## 5. 에러 핸들링

| 상황                      | 동작                                           |
| ------------------------- | ---------------------------------------------- |
| API 호출 실패 (네트워크)  | 마지막 성공 데이터 유지, 다음 폴링에서 재시도  |
| API 응답 파싱 실패        | 뱃지 변경 안 함, 콘솔 에러 로그                |
| 시즌 오프 (11월~2월)      | 경기 목록 비어있음 → 뱃지 없음, 폴링 10분 유지 |
| 우천취소 (`cancel: true`) | "취소" 뱃지 표시 또는 뱃지 없음                |
| 크롬 재시작               | `onStartup`에서 알람 재등록                    |

---

## 6. 개발 순서 (하루 일정)

### Phase 1: 코어 (오전 2~3시간)

1. **프로젝트 셋업**: `manifest.json`, 파일 구조 생성
2. **API 모듈**: `api.js` — 네이버 스포츠 API fetch + 파싱
3. **뱃지 모듈**: `badge.js` — 스코어 뱃지 표시/색상
4. **Background Worker**: `background.js` — 폴링 루프 + 한화 경기 감지

→ 이 시점에서 `chrome://extensions` 로드하여 **뱃지에 스코어가 표시되는지 확인**.

### Phase 2: 알림 + UI (오후 2~3시간)

5. **알림 모듈**: `notifications.js` — 득점/실점/시작/종료 알림
6. **팝업 UI**: `popup.html/css/js` — 스코어보드 + 이닝별 점수
7. **설정 페이지**: `options.html/css/js` — 알림 토글
8. **Storage**: `storage.js` — 설정 저장 + 이전 스코어 기록

→ **전체 동작 확인**: 뱃지 + 알림 + 팝업 + 설정.

### Phase 3: 마무리 (1시간)

9. **아이콘 제작**: 16/48/128px 한화 스타일 아이콘
10. **엣지 케이스**: 경기 없는 날, 우천취소, 더블헤더
11. **크롬 웹스토어 등록 준비**: 스크린샷, 설명, 카테고리

---

## 7. 확장 가능성 (v2)

- 내 팀 선택 (한화 기본값, 10개 팀 지원) → "KBO 스코어 알림"으로 리브랜딩
- 순위표 표시 (팝업에 탭 추가)
- 선발 투수 + 오늘의 라인업
- 경기 하이라이트 링크 (네이버 스포츠 연결)
- Firefox/Edge 확장 포팅

---

## 8. 배포

- 크롬 웹스토어 개발자 등록 ($5 일회성)
- 한화 팬 커뮤니티 공유 (에펨코리아 야갤, 한화 갤러리)
- GitHub 레포 공개 (포트폴리오용)

---

## 9. 검증 체크리스트

- [ ] 경기 없는 날 — 뱃지 비어있음
- [ ] 경기 전 — 뱃지 없음, 30분 전 시작 알림
- [ ] 경기 중 — 1분마다 스코어 갱신
- [ ] 한화 득점 — 데스크탑 알림 + 뱃지 주황색
- [ ] 한화 실점 — (설정 ON일 때만) 데스크탑 알림
- [ ] 경기 종료 — 최종 스코어 + 승/패 알림
- [ ] 팝업 — 이닝별 스코어보드 정상 렌더링
- [ ] 팝업 (경기 없는 날) — 다음 경기 일정 표시
- [ ] 설정 — 알림 토글 저장/복원
- [ ] 크롬 재시작 — 알람 재설정 확인
- [ ] API 실패 — 뱃지 유지 (에러로 깨지지 않음)
- [ ] 새벽 시간 — 불필요한 폴링 안 함

---

_작성일: 2026-03-28_
_데이터 소스: 네이버 스포츠 API (2026-03-28 검증 완료)_
_프로젝트: hanwha-score (`~/hanwha-score`)_
