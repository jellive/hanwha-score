import { HANWHA_ORANGE, LOSING_GRAY } from "./constants.js";

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
