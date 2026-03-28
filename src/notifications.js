export function sendScoreNotification({ title, message, iconUrl }) {
  chrome.notifications.create(`score-${Date.now()}`, {
    type: "basic",
    iconUrl: iconUrl || "icons/icon128.png",
    title,
    message,
    priority: 2,
    requireInteraction: false,
  });
}

export function sendGameStartNotification({ title, message, iconUrl }) {
  chrome.notifications.create("game-start", {
    type: "basic",
    iconUrl: iconUrl || "icons/icon128.png",
    title,
    message,
    priority: 1,
  });
}

export function sendGameEndNotification({ title, message, iconUrl }) {
  chrome.notifications.create("game-end", {
    type: "basic",
    iconUrl: iconUrl || "icons/icon128.png",
    title,
    message,
    priority: 2,
    requireInteraction: true,
  });
}
