const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  notifyOnScore: true,
  notifyOnConcede: false,
  notifyOnStart: true,
  notifyOnEnd: true,
};

export async function getSettings() {
  const data = await chrome.storage.sync.get("settings");
  return { ...DEFAULT_SETTINGS, ...data.settings };
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set({ settings });
}

export async function getLastScore() {
  const data = await chrome.storage.local.get("lastScore");
  return data.lastScore || null;
}

export async function setLastScore(score) {
  await chrome.storage.local.set({ lastScore: score });
}

export async function setLastGameData(detail) {
  await chrome.storage.local.set({ lastGameData: detail });
}
