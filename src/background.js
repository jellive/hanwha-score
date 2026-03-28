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

const ALARM_NAME = "checkScore";

// Event listeners MUST be at top level for MV3
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  checkAndUpdate(); // 설치 직후 즉시 실행
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  checkAndUpdate(); // 브라우저 시작 시 즉시 실행
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await checkAndUpdate();
  }
});

async function checkAndUpdate() {
  const now = new Date();
  const hour = now.getHours();

  // 00:00~11:00: no polling
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

  if (hanwhaGame.cancel) {
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
  const inning = detail?.result?.game?.currentInning || game.statusInfo;

  if (scores.hanwha > prevH && settings.notifyOnScore) {
    await sendScoreNotification({
      title: "🦅 한화 득점!",
      message: `${scores.hanwha}:${scores.opponent} (${inning})`,
      iconUrl: scores.hanwhaLogo,
    });
  }

  if (scores.opponent > prevO && settings.notifyOnConcede) {
    await sendScoreNotification({
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

  await sendGameEndNotification({
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

    await sendGameStartNotification({
      title: "오늘 한화 경기",
      message: `vs ${scores.opponentName} ${time}`,
      iconUrl: scores.hanwhaLogo,
    });

    await chrome.storage.local.set({ preGameNotified: game.gameId });
  }
}
