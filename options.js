import { getSettings, saveSettings } from "./src/storage.js";

const SETTING_IDS = [
  "notificationsEnabled",
  "notifyOnScore",
  "notifyOnConcede",
  "notifyOnStart",
  "notifyOnEnd",
];

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await getSettings();

  // Load saved settings into checkboxes
  for (const id of SETTING_IDS) {
    const el = document.getElementById(id);
    el.checked = settings[id];
  }

  updateDetailSettingsState(settings.notificationsEnabled);

  // Listen for changes
  for (const id of SETTING_IDS) {
    document.getElementById(id).addEventListener("change", handleChange);
  }
});

async function handleChange() {
  const settings = {};
  for (const id of SETTING_IDS) {
    settings[id] = document.getElementById(id).checked;
  }

  updateDetailSettingsState(settings.notificationsEnabled);
  await saveSettings(settings);
  showSaveStatus();
}

function updateDetailSettingsState(enabled) {
  const detail = document.getElementById("detail-settings");
  if (enabled) {
    detail.classList.remove("disabled");
  } else {
    detail.classList.add("disabled");
  }
}

function showSaveStatus() {
  const status = document.getElementById("save-status");
  status.classList.remove("hidden");
  setTimeout(() => {
    status.classList.add("hidden");
  }, 1500);
}
