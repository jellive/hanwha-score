import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateBadge, clearBadge } from "./badge.js";
import { HANWHA_ORANGE, LOSING_GRAY } from "./constants.js";

// Mock the chrome API surface that badge.js touches.
const setBadgeText = vi.fn();
const setBadgeBackgroundColor = vi.fn();
const setBadgeTextColor = vi.fn();

beforeEach(() => {
  setBadgeText.mockClear();
  setBadgeBackgroundColor.mockClear();
  setBadgeTextColor.mockClear();
  globalThis.chrome = {
    action: {
      setBadgeText,
      setBadgeBackgroundColor,
      setBadgeTextColor,
    },
  };
});

describe("updateBadge — Hanwha as home team", () => {
  it("formats text as <hanwha>:<opponent>", () => {
    updateBadge({
      homeTeamCode: "HH",
      awayTeamCode: "LG",
      homeTeamScore: 5,
      awayTeamScore: 3,
    });
    expect(setBadgeText).toHaveBeenCalledWith({ text: "5:3" });
  });

  it("uses Hanwha orange when winning", () => {
    updateBadge({
      homeTeamCode: "HH",
      awayTeamCode: "LG",
      homeTeamScore: 5,
      awayTeamScore: 3,
    });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: HANWHA_ORANGE,
    });
  });

  it("uses gray when losing", () => {
    updateBadge({
      homeTeamCode: "HH",
      awayTeamCode: "LG",
      homeTeamScore: 2,
      awayTeamScore: 4,
    });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: LOSING_GRAY,
    });
  });

  it("treats tie as winning (orange) — Hanwha-favoring tie-break", () => {
    updateBadge({
      homeTeamCode: "HH",
      awayTeamCode: "LG",
      homeTeamScore: 3,
      awayTeamScore: 3,
    });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: HANWHA_ORANGE,
    });
  });
});

describe("updateBadge — Hanwha as away team", () => {
  it("still formats <hanwha>:<opponent> regardless of home/away", () => {
    updateBadge({
      homeTeamCode: "LG",
      awayTeamCode: "HH",
      homeTeamScore: 4,
      awayTeamScore: 6,
    });
    expect(setBadgeText).toHaveBeenCalledWith({ text: "6:4" });
  });

  it("orange when away Hanwha leads", () => {
    updateBadge({
      homeTeamCode: "LG",
      awayTeamCode: "HH",
      homeTeamScore: 4,
      awayTeamScore: 6,
    });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: HANWHA_ORANGE,
    });
  });

  it("gray when away Hanwha trails", () => {
    updateBadge({
      homeTeamCode: "LG",
      awayTeamCode: "HH",
      homeTeamScore: 7,
      awayTeamScore: 2,
    });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: LOSING_GRAY,
    });
  });
});

describe("clearBadge", () => {
  it("sets badge text to empty string", () => {
    clearBadge();
    expect(setBadgeText).toHaveBeenCalledWith({ text: "" });
  });
});
