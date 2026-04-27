import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchTodayGames, fetchGameDetail } from "./api.js";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchTodayGames", () => {
  it("returns games array on 200 OK", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { games: [{ gameId: "20260427HHLG0" }] } }),
    });
    const games = await fetchTodayGames();
    expect(games).toEqual([{ gameId: "20260427HHLG0" }]);
  });

  it("requests today's date in YYYY-MM-DD format with KBO categoryId", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { games: [] } }),
    });
    await fetchTodayGames();
    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("api-gw.sports.naver.com");
    expect(callUrl).toContain("/schedule/games");
    expect(callUrl).toContain("fields=basic");
    expect(callUrl).toContain("upperCategoryId=kbaseball");
    expect(callUrl).toContain("categoryId=kbo");
    expect(callUrl).toMatch(/date=\d{4}-\d{2}-\d{2}/);
    // Verify URL is well-formed — not the truncated empty string a string-
    // mutation would leave behind.
    expect(callUrl.length).toBeGreaterThan(80);
  });

  it("formatDate produces zero-padded month and day for early-month dates", async () => {
    // Pin January 5 2026 — month=0 → "01" (catches `getMonth() + 1`
    // mutated to `getMonth() - 1` which would yield "-1" or "0";
    // also catches padStart "0" → "" which would leave "1" instead of
    // "01"). Using vi.setSystemTime is safe because vi.useRealTimers
    // in afterEach restores the global Date for subsequent tests.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { games: [] } }),
    });
    await fetchTodayGames();

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("date=2026-01-05");
  });

  it("formatDate produces zero-padded for double-digit dates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 18, 0, 0));

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { games: [] } }),
    });
    await fetchTodayGames();

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("date=2026-12-31");
  });

  it("returns empty array when result is missing entirely", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: null }),
    });
    const games = await fetchTodayGames();
    expect(games).toEqual([]);
  });

  it("returns empty array when games is explicitly null in result", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { games: null } }),
    });
    const games = await fetchTodayGames();
    expect(games).toEqual([]);
  });

  it("calls fetch exactly once per invocation", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { games: [] } }),
    });
    await fetchTodayGames();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns empty array on non-2xx response (no exception bubble-up)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    const games = await fetchTodayGames();
    expect(games).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    const games = await fetchTodayGames();
    expect(games).toEqual([]);
  });

  it("returns empty array when payload is missing result.games", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const games = await fetchTodayGames();
    expect(games).toEqual([]);
  });
});

describe("fetchGameDetail", () => {
  it("returns parsed JSON on 200 OK", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { gameInfo: { homeTeamScore: 5 } } }),
    });
    const detail = await fetchGameDetail("20260427HHLG0");
    expect(detail.result.gameInfo.homeTeamScore).toBe(5);
  });

  it("encodes gameId into the URL path", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await fetchGameDetail("20260427HHLG0");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api-gw.sports.naver.com/schedule/games/20260427HHLG0",
    );
  });

  it("returns null on non-2xx", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    const detail = await fetchGameDetail("INVALID");
    expect(detail).toBeNull();
  });

  it("returns null on network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ETIMEDOUT"));
    const detail = await fetchGameDetail("ANY");
    expect(detail).toBeNull();
  });
});
