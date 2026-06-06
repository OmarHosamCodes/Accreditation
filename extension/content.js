(function () {
  if (window.__accreditationToolbarInjected) return;
  window.__accreditationToolbarInjected = true;

  const root = document.createElement("div");
  root.id = "accred-toolbar";
  document.documentElement.appendChild(root);

  const state = {
    collapsed: false,
    loading: false,
    error: "",
    user: null,
    bootstrap: null,
    brand: null,
    audit: null,
    scores: [],
    evidence: [],
    selectedDimId: null,
    pinMode: false
  };

  function detectPage() {
    const host = location.hostname;
    const platform = host.includes("instagram") ? "ig" : host.includes("facebook") ? "fb" : "";
    const segment = location.pathname.split("/").filter(Boolean)[0] || "profile";
    const title = document.querySelector("h1")?.textContent?.trim() || document.title.split("|")[0].split("•")[0].trim();
    return {
      platform,
      handle: platform === "ig" ? "@" + segment.replace(/^@/, "") : segment,
      name: title || segment,
      url: location.href.split("?")[0]
    };
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function api(method, path, body) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "api", method, path, body }, resolve);
    }).then((response) => {
      if (!response?.ok) {
        throw new Error((response?.data?.errors || ["Request failed"]).join(" "));
      }
      return response.data;
    });
  }

  function selectedDim() {
    return state.bootstrap?.dimensions.find((dim) => dim.id === Number(state.selectedDimId));
  }

  function selectedScore() {
    return state.scores.find((score) => score.dim_id === Number(state.selectedDimId)) || null;
  }

  function evidenceFor(dimId) {
    return state.evidence.filter((pin) => pin.dim_id === Number(dimId));
  }

  function completion() {
    const dims = state.bootstrap?.dimensions || [];
    return dims.map((dim) => {
      const score = state.scores.find((item) => item.dim_id === dim.id);
      return Boolean(score && score.score && String(score.note || "").trim());
    });
  }

  function canPublish() {
    const done = completion();
    return done.length > 0 && done.every(Boolean);
  }

  function scoreOptions() {
    if (!state.bootstrap) return "";
    return state.bootstrap.categories.map((cat) => {
      const dims = state.bootstrap.dimensions.filter((dim) => dim.category_key === cat.key);
      return `<optgroup label="${esc(cat.name)}">${dims.map((dim) => {
        const count = evidenceFor(dim.id).length;
        const score = state.scores.find((item) => item.dim_id === dim.id);
        return `<option value="${dim.id}">${esc(dim.name)}${score ? " - " + score.score + "/10" : ""}${count ? " (" + count + ")" : ""}</option>`;
      }).join("")}</optgroup>`;
    }).join("");
  }

  function anchorsHtml(dim) {
    const anchors = state.bootstrap?.rubric_anchors?.[String(dim.id)] || state.bootstrap?.rubric_anchors?.[dim.id];
    if (!anchors) return "";
    return `<div class="accred-muted">
      <strong>1:</strong> ${esc(anchors.anchor_1)}<br>
      <strong>5:</strong> ${esc(anchors.anchor_5)}<br>
      <strong>10:</strong> ${esc(anchors.anchor_10)}
    </div>`;
  }

  function render() {
    const page = detectPage();
    root.className = state.collapsed ? "accred-collapsed" : "";
    const dim = selectedDim();
    const score = selectedScore();
    const done = completion();
    const evidence = dim ? evidenceFor(dim.id) : [];

    root.innerHTML = `
      <div class="accred-head">
        <div class="accred-seal">A</div>
        <div class="accred-title">
          <strong>Accreditation Toolbar</strong>
          <span>${esc(page.name)} - ${esc(page.handle)}</span>
        </div>
        <button class="accred-icon" id="accred-collapse" title="Collapse">${state.collapsed ? "+" : "-"}</button>
      </div>
      <div class="accred-body">
        ${state.error ? `<div class="accred-card"><span class="accred-muted">${esc(state.error)}</span></div>` : ""}
        ${!state.user ? renderLoginState(page) : renderAuditState(dim, score, evidence, done)}
      </div>
    `;

    bind();
    renderPins();
  }

  function renderLoginState(page) {
    return `
      <div class="accred-card">
        <div class="accred-muted">Configure the API URL and auditor credentials from the extension popup, then connect here.</div>
        <div class="accred-row" style="margin-top:10px">
          <button class="accred-btn primary" id="accred-connect">Connect</button>
          <a class="accred-btn" href="${esc(page.url)}" target="_blank" rel="noreferrer">Page</a>
        </div>
      </div>
    `;
  }

  function renderAuditState(dim, score, evidence, done) {
    const page = detectPage();
    return `
      <div class="accred-card">
        <div class="accred-muted">${state.audit ? "Draft #" + state.audit.id : "No audit started"} - ${esc(page.platform.toUpperCase())} ${esc(page.handle)}</div>
        <div class="accred-progress">${done.map((isDone) => `<span class="${isDone ? "done" : ""}"></span>`).join("")}</div>
        <div class="accred-row">
          <button class="accred-btn primary" id="accred-start">${state.audit ? "Resume audit" : "Start audit"}</button>
          <button class="accred-btn ${state.pinMode ? "active" : ""}" id="accred-pin-toggle" ${!state.audit ? "disabled" : ""}>Pin</button>
          <button class="accred-btn" id="accred-publish" ${!state.audit || !canPublish() ? "disabled" : ""}>Publish</button>
        </div>
      </div>
      ${state.audit && state.bootstrap ? `
        <label class="accred-label">Metric</label>
        <select class="accred-select" id="accred-dim">${scoreOptions()}</select>
        ${dim ? `
          <div class="accred-card">
            <strong>${esc(dim.name)}</strong>
            <div class="accred-muted">${esc(dim.description)}</div>
            <label class="accred-label">Score</label>
            <div class="accred-scoreline">
              <input id="accred-score" type="range" min="1" max="10" step="1" value="${score?.score || 5}">
              <output id="accred-score-out">${score?.score || 5}/10</output>
            </div>
            <label class="accred-label">Confidence</label>
            <select class="accred-select" id="accred-confidence">
              ${["low", "medium", "high"].map((level) => `<option value="${level}" ${score?.confidence === level || (!score?.confidence && level === "medium") ? "selected" : ""}>${level}</option>`).join("")}
            </select>
            <label class="accred-label">Audit note</label>
            <textarea class="accred-textarea" id="accred-note" placeholder="Public note for this metric">${esc(score?.note || "")}</textarea>
            <div class="accred-row" style="margin-top:10px">
              <button class="accred-btn primary" id="accred-save-score">Save score</button>
            </div>
            ${anchorsHtml(dim)}
          </div>
          <div class="accred-card">
            <strong>Evidence (${evidence.length})</strong>
            <div class="accred-evidence-list">
              ${evidence.length ? evidence.map((pin, index) => `<div class="accred-evidence-item"><strong>#${index + 1}</strong> ${esc(pin.note)}<br><span class="accred-muted">${esc(pin.element_text || pin.page_url)}</span></div>`).join("") : `<div class="accred-muted">Turn on pin mode and click the page to attach evidence.</div>`}
            </div>
          </div>
        ` : ""}
      ` : ""}
    `;
  }

  function bind() {
    root.querySelector("#accred-collapse")?.addEventListener("click", () => {
      state.collapsed = !state.collapsed;
      render();
    });
    root.querySelector("#accred-connect")?.addEventListener("click", connect);
    root.querySelector("#accred-start")?.addEventListener("click", startAudit);
    root.querySelector("#accred-pin-toggle")?.addEventListener("click", () => {
      state.pinMode = !state.pinMode;
      document.body.classList.toggle("accred-pin-mode", state.pinMode);
      render();
    });
    root.querySelector("#accred-publish")?.addEventListener("click", publishAudit);
    root.querySelector("#accred-dim")?.addEventListener("change", (event) => {
      state.selectedDimId = Number(event.target.value);
      render();
    });
    const scoreInput = root.querySelector("#accred-score");
    scoreInput?.addEventListener("input", () => {
      root.querySelector("#accred-score-out").textContent = scoreInput.value + "/10";
    });
    root.querySelector("#accred-save-score")?.addEventListener("click", saveScore);

    const dimSelect = root.querySelector("#accred-dim");
    if (dimSelect && state.selectedDimId) dimSelect.value = String(state.selectedDimId);
  }

  async function connect() {
    state.error = "";
    try {
      const data = await api("POST", "/api/extension/login", {});
      state.user = data.user;
      state.bootstrap = data.bootstrap;
      state.selectedDimId ||= data.bootstrap.dimensions[0]?.id || null;
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  async function startAudit() {
    state.error = "";
    try {
      if (!state.user) await connect();
      const page = detectPage();
      const resolved = await api("POST", "/api/extension/brands/resolve", {
        platform: page.platform,
        handle: page.handle,
        url: page.url,
        detected_name: page.name
      });
      state.brand = resolved.brand;
      const created = await api("POST", "/api/extension/audits", {
        brand_id: resolved.brand_id,
        rubric_version_id: state.bootstrap.rubric_version_id,
        weights_version_id: state.bootstrap.weights_version_id
      });
      state.audit = created.audit;
      state.scores = created.scores || [];
      state.evidence = created.evidence || [];
      state.bootstrap = created.bootstrap || state.bootstrap;
      state.selectedDimId ||= state.bootstrap.dimensions[0]?.id || null;
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  async function saveScore() {
    if (!state.audit || !state.selectedDimId) return;
    state.error = "";
    const score = Number(root.querySelector("#accred-score")?.value || 5);
    const note = root.querySelector("#accred-note")?.value || "";
    const confidence = root.querySelector("#accred-confidence")?.value || "medium";
    try {
      const data = await api("PUT", `/api/extension/audits/${state.audit.id}/scores/${state.selectedDimId}`, {
        score,
        note,
        confidence
      });
      const index = state.scores.findIndex((item) => item.dim_id === Number(state.selectedDimId));
      if (index >= 0) state.scores[index] = data.score;
      else state.scores.push(data.score);
      state.audit = data.audit || state.audit;
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  async function publishAudit() {
    if (!state.audit || !canPublish()) return;
    const summary = prompt("Overall audit summary", "Audited from the live page with extension evidence.");
    if (summary === null) return;
    state.error = "";
    try {
      const data = await api("POST", `/api/extension/audits/${state.audit.id}/submit`, { summary });
      state.audit = data.audit || state.audit;
      state.pinMode = false;
      document.body.classList.remove("accred-pin-mode");
      state.error = `Published: ${data.overall_score}/100 ${data.tier}`;
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  function cssSelector(element) {
    if (!(element instanceof Element)) return "";
    if (element.id) return "#" + CSS.escape(element.id);
    const parts = [];
    let node = element;
    while (node && node.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
      let part = node.nodeName.toLowerCase();
      const className = String(node.className || "").trim().split(/\s+/).filter(Boolean)[0];
      if (className) part += "." + CSS.escape(className);
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.nodeName === node.nodeName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(" > ");
  }

  function domPath(element) {
    if (!(element instanceof Element)) return "";
    const parts = [];
    let node = element;
    while (node && node.nodeType === Node.ELEMENT_NODE && parts.length < 8) {
      const parent = node.parentElement;
      const index = parent ? Array.from(parent.children).indexOf(node) + 1 : 1;
      parts.unshift(`${node.nodeName.toLowerCase()}[${index}]`);
      node = parent;
    }
    return parts.join(".");
  }

  async function addEvidence(event) {
    if (!state.pinMode || !state.audit || !state.selectedDimId) return;
    if (root.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();

    const note = prompt("Evidence note for " + selectedDim()?.name);
    if (!note) return;

    state.error = "";
    try {
      const page = detectPage();
      const data = await api("POST", `/api/extension/audits/${state.audit.id}/evidence`, {
        dim_id: Number(state.selectedDimId),
        platform: page.platform,
        page_url: page.url,
        selector: cssSelector(event.target),
        dom_path: domPath(event.target),
        x: event.clientX,
        y: event.clientY,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        element_text: event.target?.innerText || event.target?.textContent || "",
        note,
        visibility: "brand-visible"
      });
      state.evidence.push(data.evidence);
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  function renderPins() {
    document.querySelectorAll(".accred-pin").forEach((pin) => pin.remove());
    for (const pin of state.evidence) {
      if (pin.page_url && pin.page_url.split("?")[0] !== location.href.split("?")[0]) continue;
      const el = document.createElement("div");
      el.className = "accred-pin";
      el.textContent = String(state.evidence.indexOf(pin) + 1);
      el.title = pin.note;
      el.style.left = `${pin.x}px`;
      el.style.top = `${pin.y}px`;
      document.documentElement.appendChild(el);
    }
  }

  document.addEventListener("click", addEvidence, true);
  for (const eventName of ["click", "dblclick", "mousedown", "mouseup", "pointerdown", "pointerup", "keydown", "keyup", "input", "change"]) {
    root.addEventListener(eventName, (event) => event.stopPropagation());
  }

  render();
  connect();
})();
