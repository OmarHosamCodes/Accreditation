const DEFAULT_SETTINGS = {
  apiBase: "http://localhost:3000",
  username: "",
  password: "",
  containerMode: false
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...existing });
});

async function getSettings() {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS, ...stored };
}

function authHeader(settings) {
  if (!settings.username || !settings.password) return {};
  return { authorization: "Basic " + btoa(settings.username + ":" + settings.password) };
}

async function apiRequest(message) {
  const settings = await getSettings();
  const base = String(settings.apiBase || DEFAULT_SETTINGS.apiBase).replace(/\/+$/, "");
  const res = await fetch(base + message.path, {
    method: message.method || "GET",
    headers: {
      "content-type": "application/json",
      ...authHeader(settings)
    },
    body: message.body === undefined ? undefined : JSON.stringify(message.body)
  });
  const data = await res.json().catch(() => ({ ok: false, errors: ["Unexpected server response"] }));
  if (!res.ok) {
    return { ok: false, status: res.status, data };
  }
  return { ok: true, status: res.status, data };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "api") return false;
  apiRequest(message).then(sendResponse).catch((error) => {
    sendResponse({ ok: false, status: 0, data: { errors: [error.message || "Request failed"] } });
  });
  return true;
});
