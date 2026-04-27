import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSettings,
  saveSettings,
  getLastScore,
  setLastScore,
  setLastGameData,
} from "./storage.js";

const syncGet = vi.fn();
const syncSet = vi.fn();
const localGet = vi.fn();
const localSet = vi.fn();

beforeEach(() => {
  syncGet.mockReset();
  syncSet.mockReset();
  localGet.mockReset();
  localSet.mockReset();
  globalThis.chrome = {
    storage: {
      sync: { get: syncGet, set: syncSet },
      local: { get: localGet, set: localSet },
    },
  };
});

describe("getSettings", () => {
  it("returns defaults when no stored settings", async () => {
    syncGet.mockResolvedValueOnce({});
    const s = await getSettings();
    expect(s).toEqual({
      notificationsEnabled: true,
      notifyOnScore: true,
      notifyOnConcede: false,
      notifyOnStart: true,
      notifyOnEnd: true,
    });
  });

  it("merges stored settings over defaults (partial overrides)", async () => {
    syncGet.mockResolvedValueOnce({
      settings: { notifyOnConcede: true, notifyOnEnd: false },
    });
    const s = await getSettings();
    expect(s.notifyOnConcede).toBe(true);
    expect(s.notifyOnEnd).toBe(false);
    // Other defaults preserved
    expect(s.notificationsEnabled).toBe(true);
    expect(s.notifyOnStart).toBe(true);
  });

  it("queries `settings` key from sync storage", async () => {
    syncGet.mockResolvedValueOnce({});
    await getSettings();
    expect(syncGet).toHaveBeenCalledWith("settings");
  });
});

describe("saveSettings", () => {
  it("writes to sync storage under `settings` key", async () => {
    await saveSettings({ notifyOnScore: false });
    expect(syncSet).toHaveBeenCalledWith({
      settings: { notifyOnScore: false },
    });
  });
});

describe("getLastScore", () => {
  it("returns null when no stored value", async () => {
    localGet.mockResolvedValueOnce({});
    const score = await getLastScore();
    expect(score).toBeNull();
  });

  it("returns the stored value when present", async () => {
    localGet.mockResolvedValueOnce({ lastScore: { hh: 3, opp: 2 } });
    const score = await getLastScore();
    expect(score).toEqual({ hh: 3, opp: 2 });
  });

  it("queries `lastScore` from local storage (not sync)", async () => {
    localGet.mockResolvedValueOnce({});
    await getLastScore();
    expect(localGet).toHaveBeenCalledWith("lastScore");
    expect(syncGet).not.toHaveBeenCalled();
  });
});

describe("setLastScore + setLastGameData", () => {
  it("setLastScore writes to local under `lastScore` key", async () => {
    await setLastScore({ hh: 5, opp: 3 });
    expect(localSet).toHaveBeenCalledWith({ lastScore: { hh: 5, opp: 3 } });
  });

  it("setLastGameData writes to local under `lastGameData`", async () => {
    await setLastGameData({ id: "G1", inning: 7 });
    expect(localSet).toHaveBeenCalledWith({
      lastGameData: { id: "G1", inning: 7 },
    });
  });
});
