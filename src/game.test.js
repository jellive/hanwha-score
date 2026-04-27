import { describe, it, expect } from "vitest";
import { findHanwhaGame, getHanwhaScore } from "./game.js";

// Helper to build minimal KBO game payload shaped like the Naver API.
function game({
  homeTeamCode,
  awayTeamCode,
  homeTeamScore = 0,
  awayTeamScore = 0,
  homeTeamName = "Home",
  awayTeamName = "Away",
}) {
  return {
    homeTeamCode,
    awayTeamCode,
    homeTeamScore,
    awayTeamScore,
    homeTeamName,
    awayTeamName,
    homeTeamEmblemUrl: `https://example.com/${homeTeamCode}.png`,
    awayTeamEmblemUrl: `https://example.com/${awayTeamCode}.png`,
  };
}

describe("findHanwhaGame — schedule matching", () => {
  it("returns Hanwha game when Hanwha is home", () => {
    const games = [
      game({ homeTeamCode: "LG", awayTeamCode: "OB" }),
      game({ homeTeamCode: "HH", awayTeamCode: "KT" }),
    ];
    expect(findHanwhaGame(games)?.homeTeamCode).toBe("HH");
  });

  it("returns Hanwha game when Hanwha is away", () => {
    const games = [
      game({ homeTeamCode: "SS", awayTeamCode: "HH" }),
      game({ homeTeamCode: "LG", awayTeamCode: "WO" }),
    ];
    expect(findHanwhaGame(games)?.awayTeamCode).toBe("HH");
  });

  it("returns undefined when Hanwha is not playing today", () => {
    const games = [
      game({ homeTeamCode: "LG", awayTeamCode: "OB" }),
      game({ homeTeamCode: "SS", awayTeamCode: "KT" }),
      game({ homeTeamCode: "WO", awayTeamCode: "NC" }),
    ];
    expect(findHanwhaGame(games)).toBeUndefined();
  });

  it("returns undefined when schedule is empty (KBO offseason)", () => {
    expect(findHanwhaGame([])).toBeUndefined();
  });

  it("survives null / undefined / non-array inputs (defensive contract)", () => {
    // Real production has hit Naver returning .games as `null` once during
    // a brief outage in 2025-08; the extension stayed up because find on
    // a non-array returns undefined here.
    expect(findHanwhaGame(null)).toBeUndefined();
    expect(findHanwhaGame(undefined)).toBeUndefined();
    expect(findHanwhaGame("not-an-array")).toBeUndefined();
    expect(findHanwhaGame({})).toBeUndefined();
  });

  it("returns the FIRST Hanwha game on rare doubleheader days", () => {
    // KBO doubleheaders happen ~1-2 times per season (rain make-ups).
    const games = [
      game({ homeTeamCode: "HH", awayTeamCode: "LG", homeTeamScore: 5 }),
      game({ homeTeamCode: "HH", awayTeamCode: "LG", homeTeamScore: 3 }),
    ];
    const found = findHanwhaGame(games);
    expect(found?.homeTeamScore).toBe(5);
  });

  it("ignores null entries inside the games array (partial outage)", () => {
    const games = [
      null,
      undefined,
      game({ homeTeamCode: "HH", awayTeamCode: "LG" }),
    ];
    expect(findHanwhaGame(games)?.homeTeamCode).toBe("HH");
  });
});

describe("getHanwhaScore — Hanwha-first orientation", () => {
  it("home: hanwha first, opponent second", () => {
    const g = game({
      homeTeamCode: "HH",
      awayTeamCode: "LG",
      homeTeamScore: 7,
      awayTeamScore: 3,
      homeTeamName: "한화",
      awayTeamName: "LG",
    });
    const s = getHanwhaScore(g);
    expect(s.hanwha).toBe(7);
    expect(s.opponent).toBe(3);
    expect(s.opponentName).toBe("LG");
  });

  it("away: hanwha is awayTeamScore (still first in result)", () => {
    const g = game({
      homeTeamCode: "LG",
      awayTeamCode: "HH",
      homeTeamScore: 4,
      awayTeamScore: 8,
      homeTeamName: "LG",
      awayTeamName: "한화",
    });
    const s = getHanwhaScore(g);
    expect(s.hanwha).toBe(8);
    expect(s.opponent).toBe(4);
    expect(s.opponentName).toBe("LG");
  });

  it("opponent logo is the OTHER team's emblem (not Hanwha's)", () => {
    const g = game({ homeTeamCode: "HH", awayTeamCode: "WO" });
    const s = getHanwhaScore(g);
    expect(s.hanwhaLogo).toBe("https://example.com/HH.png");
    expect(s.opponentLogo).toBe("https://example.com/WO.png");
  });

  it("0:0 tied game (extra innings or unplayed) returns 0:0 cleanly", () => {
    const g = game({
      homeTeamCode: "HH",
      awayTeamCode: "LG",
      homeTeamScore: 0,
      awayTeamScore: 0,
    });
    const s = getHanwhaScore(g);
    expect(s.hanwha).toBe(0);
    expect(s.opponent).toBe(0);
  });

  it("scoreboard with negative score (parser bug) is propagated, not silently zeroed", () => {
    // We do NOT silently sanitize bad upstream data — caller can decide
    // whether to display "Invalid" in that case.
    const g = game({
      homeTeamCode: "HH",
      awayTeamCode: "LG",
      homeTeamScore: -1,
      awayTeamScore: 2,
    });
    const s = getHanwhaScore(g);
    expect(s.hanwha).toBe(-1);
  });
});
