import { fetchTodayGames, fetchGameDetail } from "./src/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const loading = document.getElementById("loading");
  const noGame = document.getElementById("no-game");
  const gameInfo = document.getElementById("game-info");

  try {
    const games = await fetchTodayGames();
    const game = games.find(
      (g) => g.homeTeamCode === "HH" || g.awayTeamCode === "HH",
    );

    loading.classList.add("hidden");

    if (!game || game.cancel) {
      noGame.classList.remove("hidden");
      return;
    }

    gameInfo.classList.remove("hidden");

    if (game.statusCode === "BEFORE") {
      renderBeforeGame(game);
    } else {
      const detail = await fetchGameDetail(game.gameId);
      renderGame(game, detail);
    }
  } catch (err) {
    loading.textContent = "API 오류 발생";
    console.error("Popup error:", err);
  }

  document.getElementById("options-link").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderBeforeGame(game) {
  const gameTime = new Date(game.gameDateTime);
  const timeStr = gameTime.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  setText("stadium", "");
  setText("game-time", "");
  setText("status-indicator", "⚪ 경기전");

  document.getElementById("home-logo").src = game.homeTeamEmblemUrl;
  document.getElementById("away-logo").src = game.awayTeamEmblemUrl;
  setText("home-name", game.homeTeamName);
  setText("away-name", game.awayTeamName);
  setText("home-score", "-");
  setText("away-score", "-");

  const pitcherEl = document.getElementById("pitcher-info");
  pitcherEl.textContent = "";
  const div = document.createElement("div");
  div.className = "before-info";
  const highlight = document.createElement("span");
  highlight.className = "time-highlight";
  highlight.textContent = timeStr;
  div.appendChild(highlight);
  div.appendChild(document.createTextNode(" 경기 예정"));
  pitcherEl.appendChild(div);
}

function renderGame(game, detail) {
  const gameData = detail?.result?.game;

  // Header
  setText("stadium", gameData?.stadium || "");
  const gameTime = new Date(game.gameDateTime);
  setText(
    "game-time",
    gameTime.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
  setText(
    "status-indicator",
    game.statusCode === "PLAYING"
      ? `🟢 ${gameData?.currentInning || game.statusInfo}`
      : "🔴 종료",
  );

  // Weather
  if (gameData?.weatherInfo?.weather) {
    setText("weather-info", gameData.weatherInfo.weather);
  }

  // Team logos and names
  document.getElementById("home-logo").src = game.homeTeamEmblemUrl;
  document.getElementById("away-logo").src = game.awayTeamEmblemUrl;
  setText("home-name", game.homeTeamName);
  setText("away-name", game.awayTeamName);

  // Scores with colors
  const homeScoreEl = document.getElementById("home-score");
  const awayScoreEl = document.getElementById("away-score");
  homeScoreEl.textContent = game.homeTeamScore;
  awayScoreEl.textContent = game.awayTeamScore;

  if (game.homeTeamScore > game.awayTeamScore) {
    homeScoreEl.classList.add("winning");
    awayScoreEl.classList.add("losing");
  } else if (game.awayTeamScore > game.homeTeamScore) {
    awayScoreEl.classList.add("winning");
    homeScoreEl.classList.add("losing");
  } else {
    homeScoreEl.style.color = "#F37321";
    awayScoreEl.style.color = "#F37321";
  }

  // Pitcher info
  if (gameData) {
    const pitcher =
      game.statusCode === "RESULT" && gameData.winPitcherName
        ? `승: ${gameData.winPitcherName} / 패: ${gameData.losePitcherName}`
        : `선발: ${gameData.homeStarterName || "?"} vs ${gameData.awayStarterName || "?"}`;
    setText("pitcher-info", pitcher);
  }

  // Inning table
  if (gameData?.homeTeamScoreByInning) {
    renderInningTable(game, gameData);
  }
}

function makeCell(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function renderInningTable(game, gameData) {
  const container = document.getElementById("inning-table-container");
  container.classList.remove("hidden");

  const awayInnings = gameData.awayTeamScoreByInning || [];
  const homeInnings = gameData.homeTeamScoreByInning || [];
  const totalInnings = Math.max(awayInnings.length, homeInnings.length, 9);

  // Header row
  const headerRow = document.getElementById("inning-header");
  headerRow.textContent = "";
  headerRow.appendChild(makeCell("th", ""));
  for (let i = 1; i <= totalInnings; i++) {
    headerRow.appendChild(makeCell("th", String(i)));
  }
  headerRow.appendChild(makeCell("th", "R", "total-col"));

  // Away row
  const awayRow = document.getElementById("away-innings");
  awayRow.textContent = "";
  const awayLabel = makeCell("td", "");
  const awayStrong = document.createElement("strong");
  awayStrong.textContent = game.awayTeamName;
  awayLabel.appendChild(awayStrong);
  awayRow.appendChild(awayLabel);
  for (let i = 0; i < totalInnings; i++) {
    awayRow.appendChild(
      makeCell("td", awayInnings[i] != null ? String(awayInnings[i]) : "-"),
    );
  }
  const awayR = gameData.awayTeamRheb?.[0] ?? game.awayTeamScore;
  awayRow.appendChild(makeCell("td", String(awayR), "total-col"));

  // Home row
  const homeRow = document.getElementById("home-innings");
  homeRow.textContent = "";
  const homeLabel = makeCell("td", "");
  const homeStrong = document.createElement("strong");
  homeStrong.textContent = game.homeTeamName;
  homeLabel.appendChild(homeStrong);
  homeRow.appendChild(homeLabel);
  for (let i = 0; i < totalInnings; i++) {
    homeRow.appendChild(
      makeCell("td", homeInnings[i] != null ? String(homeInnings[i]) : "-"),
    );
  }
  const homeR = gameData.homeTeamRheb?.[0] ?? game.homeTeamScore;
  homeRow.appendChild(makeCell("td", String(homeR), "total-col"));
}
