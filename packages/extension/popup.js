const DEFAULTS = {
  apiBase: "http://localhost:3000",
  webBase: "http://localhost:5173",
  bearerToken: "",
  userName: "",
  containerMode: false
};

const els = {
  apiBase: document.getElementById("apiBase"),
  webBase: document.getElementById("webBase"),
  signIn: document.getElementById("signIn"),
  disconnect: document.getElementById("disconnect"),
  status: document.getElementById("status")
};

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(values) {
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

function sendMessage(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function bindInputDirections() {
  window.AccredTextDirection?.bindTextDirectionAll(document);
}

function renderStatus(settings) {
  if (settings.bearerToken) {
    els.status.textContent = settings.userName
      ? `Connected as ${settings.userName}. Reload a supported page to show the toolbar.`
      : "Connected. Reload a supported page to show the toolbar.";
  } else {
    els.status.textContent = "Sign in on the website to connect the audit toolbar.";
  }
}

async function load() {
  const settings = await storageGet(Object.keys(DEFAULTS));
  const merged = { ...DEFAULTS, ...settings };
  els.apiBase.value = merged.apiBase;
  els.webBase.value = merged.webBase;
  renderStatus(merged);
  bindInputDirections();
}

async function saveSettings() {
  const settings = {
    apiBase: els.apiBase.value.trim().replace(/\/+$/, "") || DEFAULTS.apiBase,
    webBase: els.webBase.value.trim().replace(/\/+$/, "") || DEFAULTS.webBase
  };
  await storageSet(settings);
  return settings;
}

async function signIn() {
  const settings = await saveSettings();
  els.status.textContent = "Opening website sign-in…";
  await chrome.tabs.create({ url: `${settings.webBase}/admin/connect-extension` });
}

async function disconnect() {
  await storageSet({ bearerToken: "", userName: "" });
  els.status.textContent = "Signed out.";
}

async function testConnection() {
  const settings = await storageGet(["bearerToken"]);
  if (!settings.bearerToken) return;
  const response = await sendMessage({
    type: "api",
    method: "POST",
    path: "/api/extension/login",
    body: {}
  });
  if (response?.ok) {
    const userName = response.data?.user?.name || settings.userName || "Auditor";
    await storageSet({ userName });
    renderStatus({ bearerToken: settings.bearerToken, userName });
  }
}

els.signIn.addEventListener("click", () => {
  void signIn();
});
els.disconnect.addEventListener("click", () => {
  void disconnect();
});
els.apiBase.addEventListener("change", () => {
  void saveSettings();
});
els.webBase.addEventListener("change", () => {
  void saveSettings();
});

load().then(() => {
  void testConnection();
  if (!window.gsap) return;
  window.gsap.fromTo("main", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .24, ease: "power2.out" });
  window.gsap.fromTo("label, button", { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .22, stagger: .035, delay: .04, ease: "power2.out" });
});
