const DEFAULTS = {
  apiBase: "http://localhost:3000",
  username: "",
  password: ""
};

const els = {
  apiBase: document.getElementById("apiBase"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  save: document.getElementById("save"),
  status: document.getElementById("status")
};

async function load() {
  const settings = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const merged = { ...DEFAULTS, ...settings };
  els.apiBase.value = merged.apiBase;
  els.username.value = merged.username;
  els.password.value = merged.password;
}

async function save() {
  const settings = {
    apiBase: els.apiBase.value.trim().replace(/\/+$/, "") || DEFAULTS.apiBase,
    username: els.username.value.trim(),
    password: els.password.value
  };
  await chrome.storage.sync.set(settings);
  els.status.textContent = "Testing credentials...";
  const response = await chrome.runtime.sendMessage({
    type: "api",
    method: "POST",
    path: "/api/extension/login",
    body: {}
  });
  if (response?.ok) {
    els.status.textContent = "Connected. Reload a supported page to show the toolbar.";
  } else {
    els.status.textContent = (response?.data?.errors || ["Could not connect."]).join(" ");
  }
}

els.save.addEventListener("click", save);
load();
