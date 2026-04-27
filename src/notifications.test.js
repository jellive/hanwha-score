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
});

describe("sendGameEndNotification", () => {
  it("uses fixed id 'game-end' with high priority + requireInteraction", async () => {
    await sendGameEndNotification({ title: "승리!", message: "5:3" });
    const [id, opts] = create.mock.calls[0];
    expect(id).toBe("game-end");
    expect(opts.priority).toBe(2);
    expect(opts.requireInteraction).toBe(true);
  });
});
