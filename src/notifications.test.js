import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  sendScoreNotification,
  sendGameStartNotification,
  sendGameEndNotification,
} from "./notifications.js";

const create = vi.fn((id, opts, cb) => cb && cb(id));
const fetchMock = vi.fn();

beforeEach(() => {
  create.mockReset();
  create.mockImplementation((id, opts, cb) => cb && cb(id));
  fetchMock.mockReset();
  globalThis.chrome = {
    notifications: { create },
    runtime: {},
  };
  globalThis.fetch = fetchMock;
});

describe("sendScoreNotification", () => {
  it("uses local icon when no remote iconUrl supplied", async () => {
    await sendScoreNotification({
      title: "🦅 한화 득점!",
      message: "5:3 (7회)",
    });
    const [, opts] = create.mock.calls[0];
    expect(opts.iconUrl).toBe("icons/icon128.png");
    expect(opts.title).toBe("🦅 한화 득점!");
    expect(opts.message).toBe("5:3 (7회)");
    expect(opts.priority).toBe(2);
    expect(opts.requireInteraction).toBe(false);
  });

  it("falls back to local icon if remote fetch fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("fetch failed"));
    await sendScoreNotification({
      title: "x",
      message: "y",
      iconUrl: "https://example.com/missing.png",
    });
    const [, opts] = create.mock.calls[0];
    expect(opts.iconUrl).toBe("icons/icon128.png");
  });

  it("falls back to local icon if remote returns non-2xx", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await sendScoreNotification({
      title: "x",
      message: "y",
      iconUrl: "https://example.com/missing.png",
    });
    const [, opts] = create.mock.calls[0];
    expect(opts.iconUrl).toBe("icons/icon128.png");
  });

  it("converts remote PNG to data: URL on 2xx", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG signature
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: async () => ({
        type: "image/png",
        arrayBuffer: async () => bytes.buffer,
      }),
    });
    await sendScoreNotification({
      title: "x",
      message: "y",
      iconUrl: "https://example.com/team.png",
    });
    const [, opts] = create.mock.calls[0];
    expect(opts.iconUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("creates a unique id with score- prefix", async () => {
    await sendScoreNotification({ title: "x", message: "y" });
    const [id] = create.mock.calls[0];
    expect(id).toMatch(/^score-\d+$/);
  });
});

describe("sendGameStartNotification", () => {
  it("uses fixed id 'game-start' so duplicate alerts replace each other", async () => {
    await sendGameStartNotification({ title: "Play ball", message: "vs LG" });
    const [id, opts] = create.mock.calls[0];
    expect(id).toBe("game-start");
    expect(opts.priority).toBe(1);
  });

  it("declares basic notification type", async () => {
    await sendGameStartNotification({ title: "x", message: "y" });
    const [, opts] = create.mock.calls[0];
    expect(opts.type).toBe("basic");
  });

  it("propagates title + message verbatim", async () => {
    await sendGameStartNotification({
      title: "Play 한화 ball",
      message: "vs LG @ 18:30",
    });
    const [, opts] = create.mock.calls[0];
    expect(opts.title).toBe("Play 한화 ball");
    expect(opts.message).toBe("vs LG @ 18:30");
  });

  it("logs error when chrome.runtime.lastError fires in callback", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockImplementation((id, opts, cb) => {
      globalThis.chrome.runtime.lastError = { message: "kBytesQuota" };
      cb && cb(id);
      delete globalThis.chrome.runtime.lastError;
    });
    await sendGameStartNotification({ title: "x", message: "y" });
    expect(errSpy).toHaveBeenCalledWith(
      "Start notification failed:",
      "kBytesQuota",
    );
    errSpy.mockRestore();
  });

  it("does NOT log when lastError is absent in callback", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendGameStartNotification({ title: "x", message: "y" });
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("sendGameEndNotification", () => {
  it("uses fixed id 'game-end' with high priority + requireInteraction", async () => {
    await sendGameEndNotification({ title: "승리!", message: "5:3" });
    const [id, opts] = create.mock.calls[0];
    expect(id).toBe("game-end");
    expect(opts.priority).toBe(2);
    expect(opts.requireInteraction).toBe(true);
  });

  it("declares basic notification type", async () => {
    await sendGameEndNotification({ title: "x", message: "y" });
    const [, opts] = create.mock.calls[0];
    expect(opts.type).toBe("basic");
  });

  it("propagates title + message verbatim", async () => {
    await sendGameEndNotification({
      title: "한화 승리",
      message: "5:3 vs LG",
    });
    const [, opts] = create.mock.calls[0];
    expect(opts.title).toBe("한화 승리");
    expect(opts.message).toBe("5:3 vs LG");
  });

  it("logs error when chrome.runtime.lastError fires in callback", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockImplementation((id, opts, cb) => {
      globalThis.chrome.runtime.lastError = { message: "permission denied" };
      cb && cb(id);
      delete globalThis.chrome.runtime.lastError;
    });
    await sendGameEndNotification({ title: "x", message: "y" });
    expect(errSpy).toHaveBeenCalledWith(
      "End notification failed:",
      "permission denied",
    );
    errSpy.mockRestore();
  });

  it("does NOT log when lastError is absent in callback", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendGameEndNotification({ title: "x", message: "y" });
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("sendScoreNotification — chrome.runtime.lastError handling", () => {
  it("logs error with score-specific message when lastError fires", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockImplementation((id, opts, cb) => {
      globalThis.chrome.runtime.lastError = { message: "icon too large" };
      cb && cb(id);
      delete globalThis.chrome.runtime.lastError;
    });
    await sendScoreNotification({ title: "x", message: "y" });
    expect(errSpy).toHaveBeenCalledWith(
      "Score notification failed:",
      "icon too large",
    );
    errSpy.mockRestore();
  });
});
