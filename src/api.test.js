import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchTodayGames, fetchGameDetail } from "./api.js";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
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
    expect(callUrl).toContain("upperCategoryId=kbaseball");
    expect(callUrl).toContain("categoryId=kbo");
    expect(callUrl).toMatch(/date=\d{4}-\d{2}-\d{2}/);
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
