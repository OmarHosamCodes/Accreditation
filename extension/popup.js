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

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
}

function storageSet(values) {
  return new Promise((resolve) => chrome.storage.sync.set(values, resolve));
}

function sendMessage(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function load() {
  const settings = await storageGet(Object.keys(DEFAULTS));
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
  await storageSet(settings);
  els.status.textContent = "Testing credentials...";
  const response = await sendMessage({
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
load().then(() => {
  if (!window.gsap) return;
  window.gsap.fromTo("main", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .24, ease: "power2.out" });
  window.gsap.fromTo("label, button", { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .22, stagger: .035, delay: .04, ease: "power2.out" });
});
