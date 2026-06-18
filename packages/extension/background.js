const DEFAULT_SETTINGS = {
  apiBase: "http://localhost:3000",
  webBase: "http://localhost:5173",
  bearerToken: "",
  userName: "",
  containerMode: false
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  await chrome.storage.local.set({ ...DEFAULT_SETTINGS, ...existing });
});

async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS, ...stored };
}

function authHeader(settings) {
  if (!settings.bearerToken) return {};
  return { authorization: "Bearer " + settings.bearerToken };
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
    if (res.status === 401) {
      await chrome.storage.local.set({ bearerToken: "", userName: "" });
    }
    return { ok: false, status: res.status, data };
  }
  return { ok: true, status: res.status, data };
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "accred-auth" || !message.token) {
    sendResponse({ ok: false, error: "Invalid auth message" });
    return false;
  }

  const userName = message.user?.name || "";
  chrome.storage.local.set({
    bearerToken: message.token,
    userName
  }).then(() => {
    sendResponse({ ok: true });
  }).catch((error) => {
    sendResponse({ ok: false, error: error.message || "Could not store token" });
  });
  return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "api") return false;
  apiRequest(message).then(sendResponse).catch((error) => {
    sendResponse({ ok: false, status: 0, data: { errors: [error.message || "Request failed"] } });
  });
  return true;
});
