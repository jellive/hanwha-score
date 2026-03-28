const LOCAL_ICON = "icons/icon128.png";

/**
 * MV3 service worker에서 외부 이미지를 data URL로 변환.
 * chrome.notifications.create()는 외부 HTTP URL을 iconUrl로 지원하지 않으므로
 * fetch → blob → base64 변환이 필요하다.
 */
async function toDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return LOCAL_ICON;
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ""),
    );
    return `data:${blob.type};base64,${base64}`;
  } catch {
    return LOCAL_ICON;
  }
}

export async function sendScoreNotification({ title, message, iconUrl }) {
  const resolvedIcon = iconUrl ? await toDataUrl(iconUrl) : LOCAL_ICON;
  chrome.notifications.create(
    `score-${Date.now()}`,
    {
      type: "basic",
      iconUrl: resolvedIcon,
      title,
      message,
      priority: 2,
      requireInteraction: false,
    },
    (id) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Score notification failed:",
          chrome.runtime.lastError.message,
        );
      }
    },
  );
}

export async function sendGameStartNotification({ title, message, iconUrl }) {
  const resolvedIcon = iconUrl ? await toDataUrl(iconUrl) : LOCAL_ICON;
  chrome.notifications.create(
    "game-start",
    {
      type: "basic",
      iconUrl: resolvedIcon,
      title,
      message,
      priority: 1,
    },
    (id) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Start notification failed:",
          chrome.runtime.lastError.message,
        );
      }
    },
  );
}

export async function sendGameEndNotification({ title, message, iconUrl }) {
  const resolvedIcon = iconUrl ? await toDataUrl(iconUrl) : LOCAL_ICON;
  chrome.notifications.create(
    "game-end",
    {
      type: "basic",
      iconUrl: resolvedIcon,
      title,
      message,
      priority: 2,
      requireInteraction: true,
    },
    (id) => {
      if (chrome.runtime.lastError) {
        console.error(
          "End notification failed:",
          chrome.runtime.lastError.message,
        );
      }
    },
  );
}
