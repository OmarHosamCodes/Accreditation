(function () {
  if (window.__accreditationToolbarInjected) return;
  window.__accreditationToolbarInjected = true;

  const root = document.createElement("div");
  root.id = "accred-toolbar";
  document.documentElement.appendChild(root);
  const composer = document.createElement("div");
  composer.id = "accred-evidence-popover";
  document.documentElement.appendChild(composer);

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
    pinMode: false,
    pendingEvidence: null,
    pendingElement: null,
    mounted: false
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

  function animateRender() {
    if (!window.gsap) return;
    if (!state.mounted) {
      window.gsap.fromTo(root, { autoAlpha: 0, y: 14, scale: .985 }, { autoAlpha: 1, y: 0, scale: 1, duration: .28, ease: "power3.out" });
      state.mounted = true;
    }
    window.gsap.fromTo(root.querySelectorAll(".accred-card"), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .22, stagger: .025, ease: "power2.out" });
    window.gsap.fromTo(root.querySelectorAll(".accred-progress span.done"), { scaleY: .45 }, { scaleY: 1, duration: .2, transformOrigin: "center", ease: "back.out(2)" });
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
    renderComposer();
    requestAnimationFrame(animateRender);
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
            <div class="accred-card-title">${esc(dim.name)}</div>
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
            <div class="accred-card-title">Evidence (${evidence.length})</div>
            <div class="accred-evidence-list">
              ${evidence.length ? evidence.map((pin, index) => `<div class="accred-evidence-item"><strong>#${index + 1}</strong> ${esc(pin.note)}<br><span class="accred-muted">${esc(pin.element_text || pin.page_url)}</span></div>`).join("") : `<div class="accred-muted">Turn on pin mode and click the page to attach evidence.</div>`}
            </div>
          </div>
        ` : ""}
      ` : ""}
    `;
  }

  function renderComposer() {
    const pending = state.pendingEvidence;
    const dim = selectedDim();
    if (!pending || !dim) {
      composer.classList.remove("show");
      composer.innerHTML = "";
      return;
    }

    composer.innerHTML = `
      <div class="accred-pop-arrow"></div>
      <div class="accred-card accred-evidence-compose">
        <div class="accred-card-title">New evidence</div>
        <div class="accred-target">
          <span>Target</span>
          <strong>${esc(pending.element_text || pending.selector || "Page area")}</strong>
        </div>
        <label class="accred-label">Evidence note</label>
        <textarea class="accred-textarea" id="accred-evidence-note" placeholder="What does this prove for ${esc(dim.name)}?">${esc(pending.note || "")}</textarea>
        <label class="accred-label">Visibility</label>
        <select class="accred-select" id="accred-evidence-visibility">
          <option value="brand-visible" ${pending.visibility === "brand-visible" ? "selected" : ""}>Brand-visible</option>
          <option value="private" ${pending.visibility === "private" ? "selected" : ""}>Private</option>
          <option value="public" ${pending.visibility === "public" ? "selected" : ""}>Public</option>
        </select>
        <div class="accred-row accred-actions">
          <button class="accred-btn primary" id="accred-save-evidence">Save evidence</button>
          <button class="accred-btn" id="accred-cancel-evidence">Cancel</button>
        </div>
      </div>
    `;
    composer.classList.add("show");
    positionComposer();
    bindComposer();
    if (window.gsap) window.gsap.fromTo(composer, { autoAlpha: 0, y: 8, scale: .985 }, { autoAlpha: 1, y: 0, scale: 1, duration: .2, ease: "power2.out" });
  }

  function positionComposer() {
    if (!state.pendingEvidence || !composer.classList.contains("show")) return;
    const position = pinPosition(state.pendingEvidence);
    const width = 286;
    const margin = 12;
    const left = Math.min(Math.max(position.x + 18, margin), window.innerWidth - width - margin);
    const top = Math.min(Math.max(position.y - 18, margin), window.innerHeight - 270);
    composer.style.left = `${left}px`;
    composer.style.top = `${Math.max(top, margin)}px`;
    composer.style.width = `${width}px`;
  }

  function bindComposer() {
    composer.querySelector("#accred-save-evidence")?.addEventListener("click", saveEvidence);
    composer.querySelector("#accred-cancel-evidence")?.addEventListener("click", () => {
      state.pendingEvidence = null;
      state.pendingElement = null;
      render();
    });
    composer.querySelector("#accred-evidence-note")?.focus();
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

  async function saveEvidence() {
    if (!state.audit || !state.pendingEvidence) return;
    const note = composer.querySelector("#accred-evidence-note")?.value?.trim() || "";
    const visibility = composer.querySelector("#accred-evidence-visibility")?.value || "brand-visible";
    if (note.length < 2) {
      state.error = "Evidence note is required.";
      render();
      return;
    }

    state.error = "";
    try {
      const data = await api("POST", `/api/extension/audits/${state.audit.id}/evidence`, {
        ...state.pendingEvidence,
        note,
        visibility
      });
      state.evidence.push(data.evidence);
      state.pendingEvidence = null;
      state.pendingElement = null;
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

  function resolveDomPath(path) {
    if (!path) return null;
    const parts = String(path).split(".");
    let node = null;
    for (const part of parts) {
      const match = part.match(/^([a-z0-9-]+)\[(\d+)\]$/i);
      if (!match) return null;
      const tag = match[1].toLowerCase();
      const index = Number(match[2]) - 1;
      if (!node) {
        node = tag === "html" ? document.documentElement : document.getElementsByTagName(tag)[index];
      } else {
        node = Array.from(node.children).filter((child) => child.nodeName.toLowerCase() === tag)[index] || null;
      }
      if (!node) return null;
    }
    return node;
  }

  function resolvePinElement(pin) {
    if (pin === state.pendingEvidence && state.pendingElement?.isConnected) return state.pendingElement;
    if (pin.selector) {
      try {
        const element = document.querySelector(pin.selector);
        if (element) return element;
      } catch {}
    }
    return resolveDomPath(pin.dom_path);
  }

  function pinPosition(pin) {
    const element = resolvePinElement(pin);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width || rect.height) {
        const rx = Number.isFinite(Number(pin.offset_x_ratio)) ? Number(pin.offset_x_ratio) : .5;
        const ry = Number.isFinite(Number(pin.offset_y_ratio)) ? Number(pin.offset_y_ratio) : .5;
        return {
          x: rect.left + rect.width * Math.min(Math.max(rx, 0), 1),
          y: rect.top + rect.height * Math.min(Math.max(ry, 0), 1),
          tied: true
        };
      }
    }
    return { x: Number(pin.x) || 0, y: Number(pin.y) || 0, tied: false };
  }

  async function addEvidence(event) {
    if (!state.pinMode || !state.audit || !state.selectedDimId) return;
    if (root.contains(event.target) || composer.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();

    const page = detectPage();
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const offsetXRatio = rect.width ? (event.clientX - rect.left) / rect.width : .5;
    const offsetYRatio = rect.height ? (event.clientY - rect.top) / rect.height : .5;
    state.error = "";
    state.pinMode = false;
    document.body.classList.remove("accred-pin-mode");
    state.pendingElement = target;
    state.pendingEvidence = {
      dim_id: Number(state.selectedDimId),
      platform: page.platform,
      page_url: page.url,
      selector: cssSelector(target),
      dom_path: domPath(target),
      x: event.clientX,
      y: event.clientY,
      offset_x_ratio: Math.min(Math.max(offsetXRatio, 0), 1),
      offset_y_ratio: Math.min(Math.max(offsetYRatio, 0), 1),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      element_text: String(target.innerText || target.textContent || "").trim().slice(0, 500),
      note: "",
      visibility: "brand-visible"
    };
    render();
  }

  function renderPins(animate = true) {
    document.querySelectorAll(".accred-pin").forEach((pin) => pin.remove());
    for (const pin of state.evidence) {
      if (pin.page_url && pin.page_url.split("?")[0] !== location.href.split("?")[0]) continue;
      const el = document.createElement("div");
      const position = pinPosition(pin);
      el.className = "accred-pin";
      if (!position.tied) el.classList.add("detached");
      el.textContent = String(state.evidence.indexOf(pin) + 1);
      el.title = pin.note;
      el.style.left = `${position.x}px`;
      el.style.top = `${position.y}px`;
      document.documentElement.appendChild(el);
      if (animate && window.gsap) window.gsap.fromTo(el, { scale: .55, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .24, ease: "back.out(2)" });
    }
    if (state.pendingEvidence) {
      const el = document.createElement("div");
      const position = pinPosition(state.pendingEvidence);
      el.className = "accred-pin pending";
      el.textContent = "+";
      el.title = "Unsaved evidence";
      el.style.left = `${position.x}px`;
      el.style.top = `${position.y}px`;
      document.documentElement.appendChild(el);
      if (animate && window.gsap) window.gsap.fromTo(el, { scale: .55, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .24, ease: "back.out(2)" });
    }
  }

  document.addEventListener("click", addEvidence, true);
  for (const eventName of ["click", "dblclick", "mousedown", "mouseup", "pointerdown", "pointerup", "keydown", "keyup", "input", "change"]) {
    root.addEventListener(eventName, (event) => event.stopPropagation());
    composer.addEventListener(eventName, (event) => event.stopPropagation());
  }
  window.addEventListener("scroll", () => {
    renderPins(false);
    positionComposer();
  }, true);
  window.addEventListener("resize", () => {
    renderPins(false);
    positionComposer();
  });

  render();
  connect();
})();
