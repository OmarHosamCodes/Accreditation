(function () {
  if (window.__accreditationToolbarInjected) return;
  window.__accreditationToolbarInjected = true;

  const root = document.createElement("div");
  root.id = "accred-toolbar";
  document.documentElement.appendChild(root);
  const composer = document.createElement("div");
  composer.id = "accred-evidence-popover";
  document.documentElement.appendChild(composer);
  const tooltip = document.createElement("div");
  tooltip.id = "accred-tooltip";
  document.documentElement.appendChild(tooltip);

  const MOBILE_QUERY = "(max-width: 640px), (pointer: coarse) and (max-width: 820px)";
  const CONTAINER_DOCK_MAX_WIDTH = 400;
  const CONTAINER_DOCK_VIEWPORT_RATIO = 0.36;
  const DEFAULT_PUBLISH_SUMMARY = "Audited from the live page with extension evidence.";

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
    metricMenuOpen: false,
    publishedUrl: "",
    mobileSection: "score",
    publishOpen: false,
    publishSummary: DEFAULT_PUBLISH_SUMMARY,
    mounted: false,
    containerMode: false
  };
  let lastMobileSurface = null;

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

  function getApiBase() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ apiBase: "http://localhost:3000" }, (stored) => {
        resolve(String(stored.apiBase || "http://localhost:3000").replace(/\/+$/, ""));
      });
    });
  }

  function normalizePublicAuditUrl(rawUrl, auditId, apiBase) {
    if (rawUrl) {
      try {
        const url = new URL(rawUrl);
        const hashMatch = url.hash.match(/^#audit\/(\d+)$/);
        if (hashMatch) {
          return `${url.origin}/audit/${hashMatch[1]}`;
        }
        return rawUrl;
      } catch {
        /* fall through */
      }
    }
    if (auditId > 0 && apiBase) {
      return `${apiBase.replace(/\/+$/, "")}/audit/${auditId}`;
    }
    return "";
  }

  function isMobileSurface() {
    return window.matchMedia?.(MOBILE_QUERY).matches || window.innerWidth <= 640;
  }

  function containerDockWidth() {
    return Math.min(CONTAINER_DOCK_MAX_WIDTH, window.innerWidth * CONTAINER_DOCK_VIEWPORT_RATIO);
  }

  function containerModeActive() {
    return state.containerMode && !isMobileSurface();
  }

  function pageViewportBounds() {
    if (!containerModeActive()) {
      return { left: 0, width: window.innerWidth };
    }
    const dockWidth = containerDockWidth();
    return {
      left: 0,
      width: Math.max(0, window.innerWidth - dockWidth)
    };
  }

  function loadContainerMode() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ containerMode: false }, (stored) => {
        state.containerMode = Boolean(stored.containerMode);
        resolve();
      });
    });
  }

  function setContainerMode(enabled) {
    if (isMobileSurface()) enabled = false;
    state.containerMode = enabled;
    chrome.storage.local.set({ containerMode: enabled });
    syncViewportClass();
    positionComposer();
    render();
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }

  function setMobileSection(section) {
    if (!["score", "metrics", "evidence"].includes(section)) return;
    state.mobileSection = section;
    if (section !== "metrics") state.metricMenuOpen = false;
    render();
  }

  function closeTransientPanels() {
    state.metricMenuOpen = false;
    state.publishOpen = false;
  }

  function syncViewportClass() {
    const classes = [];
    if (state.collapsed) classes.push("accred-collapsed");
    if (isMobileSurface()) classes.push("accred-mobile");
    if (state.pinMode) classes.push("accred-pin-active");
    if (containerModeActive()) classes.push("accred-container-dock");
    root.className = classes.join(" ");
    document.documentElement.classList.toggle("accred-container-mode", containerModeActive());
  }

  function animateRender() {
    if (!window.gsap || prefersReducedMotion()) return;
    if (!state.mounted) {
      window.gsap.fromTo(root, { autoAlpha: 0, y: 14, scale: .985 }, { autoAlpha: 1, y: 0, scale: 1, duration: .28, ease: "power3.out" });
      state.mounted = true;
    }
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

  function metricIndex() {
    return (state.bootstrap?.dimensions || []).findIndex((dim) => dim.id === Number(state.selectedDimId));
  }

  function setSelectedDim(id) {
    state.selectedDimId = Number(id);
    state.metricMenuOpen = false;
    state.mobileSection = "score";
    if (state.pendingEvidence && state.pendingEvidence.dim_id !== Number(id)) {
      state.pendingEvidence = null;
      state.pendingElement = null;
    }
    render();
  }

  function moveMetric(step) {
    const dims = state.bootstrap?.dimensions || [];
    if (!dims.length) return;
    const current = metricIndex();
    const next = current < 0 ? 0 : (current + step + dims.length) % dims.length;
    setSelectedDim(dims[next].id);
  }

  function isLastMetric() {
    const dims = state.bootstrap?.dimensions || [];
    return dims.length > 0 && metricIndex() === dims.length - 1;
  }

  function completion() {
    const dims = state.bootstrap?.dimensions || [];
    return dims.map((dim) => {
      const score = state.scores.find((item) => item.dim_id === dim.id);
      return Boolean(score && score.score && String(score.note || "").trim());
    });
  }

  function canPublish() {
    return Boolean(state.audit && state.audit.status !== "published");
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

  function icon(name) {
    const attrs = `viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
    const paths = {
      left: `<polyline points="15 18 9 12 15 6"></polyline>`,
      right: `<polyline points="9 18 15 12 9 6"></polyline>`,
      low: `<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
      medium: `<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`,
      high: `<path d="M20 6 9 17l-5-5"></path><circle cx="12" cy="12" r="9"></circle>`,
      delete: `<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>`,
      container: `<rect x="3" y="4" width="14" height="16" rx="2"></rect><rect x="19" y="7" width="2" height="10" rx="1"></rect>`
    };
    return `<svg ${attrs}>${paths[name] || ""}</svg>`;
  }

  function renderMetricNav(dim) {
    const dims = state.bootstrap?.dimensions || [];
    const current = metricIndex();
    const label = dim ? `${current + 1}/${dims.length} ${dim.name}` : "Choose metric";
    return `
      <div class="accred-metric-nav">
        <button class="accred-icon-btn" id="accred-prev-metric" data-tip="Previous metric" aria-label="Previous metric">${icon("left")}</button>
        <button class="accred-metric-current" id="accred-open-metrics" aria-expanded="${state.metricMenuOpen ? "true" : "false"}" aria-label="Choose metric">${esc(label)}</button>
        <button class="accred-icon-btn" id="accred-next-metric" data-tip="Next metric" aria-label="Next metric">${icon("right")}</button>
      </div>
      ${state.metricMenuOpen ? renderMetricMenu() : ""}
    `;
  }

  function renderMetricMenu() {
    if (!state.bootstrap) return "";
    return `
      <div class="accred-metric-menu">
        ${state.bootstrap.categories.map((cat) => {
          const dims = state.bootstrap.dimensions.filter((dim) => dim.category_key === cat.key);
          return `<div class="accred-metric-group">
            <div class="accred-metric-group-title">${esc(cat.name)}</div>
            ${dims.map((dim) => {
              const count = evidenceFor(dim.id).length;
              const score = state.scores.find((item) => item.dim_id === dim.id);
              const active = dim.id === Number(state.selectedDimId);
              return `<button class="accred-metric-option ${active ? "active" : ""}" data-dim-id="${dim.id}" aria-current="${active ? "true" : "false"}">
                <span>${esc(dim.name)}</span>
                <b>${score ? `${score.score}/10` : "-"}${count ? ` / ${count}` : ""}</b>
              </button>`;
            }).join("")}
          </div>`;
        }).join("")}
      </div>
    `;
  }

  function renderStars(value) {
    const current = Number(value) || 5;
    return `
      <div class="accred-stars" data-value="${current}">
        ${Array.from({ length: 10 }, (_, index) => {
          const score = index + 1;
          return `<button class="accred-star ${score <= current ? "on" : ""}" data-score="${score}" data-tip="${score}/10" aria-label="Score ${score} out of 10" aria-pressed="${score === current ? "true" : "false"}">&#9733;</button>`;
        }).join("")}
        <output id="accred-score-out">${current}/10</output>
      </div>
    `;
  }

  function renderConfidenceButtons(value) {
    const current = value || "medium";
    const items = [
      ["low", "Low confidence", "low"],
      ["medium", "Medium confidence", "medium"],
      ["high", "High confidence", "high"]
    ];
    return `<div class="accred-confidence-buttons" data-value="${esc(current)}">
      ${items.map(([level, label, iconName]) => `<button class="accred-icon-btn confidence ${current === level ? "active" : ""}" data-confidence="${level}" data-tip="${label}" aria-label="${label}" aria-pressed="${current === level ? "true" : "false"}">${icon(iconName)}</button>`).join("")}
    </div>`;
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
    syncViewportClass();
    lastMobileSurface = isMobileSurface();
    const dim = selectedDim();
    const score = selectedScore();
    const done = completion();
    const evidence = dim ? evidenceFor(dim.id) : [];
    const collapseLabel = state.collapsed ? "Expand Accreditation toolbar" : "Collapse Accreditation toolbar";
    const containerLabel = state.containerMode ? "Exit container mode" : "Enter container mode";

    root.innerHTML = `
      <div class="accred-head">
        <div class="accred-seal">A</div>
        <div class="accred-title">
          <strong>Accreditation Toolbar</strong>
          <span>${esc(page.name)} - ${esc(page.handle)}</span>
        </div>
        <button class="accred-icon-btn accred-container-toggle ${state.containerMode ? "active" : ""}" id="accred-container-toggle" data-tip="Container mode" aria-label="${containerLabel}" aria-pressed="${state.containerMode ? "true" : "false"}">${icon("container")}</button>
        <button class="accred-icon-btn" id="accred-collapse" title="${collapseLabel}" aria-label="${collapseLabel}">${state.collapsed ? "+" : "-"}</button>
      </div>
      ${state.pinMode && isMobileSurface() ? renderMobilePinHint() : ""}
      <div class="accred-body">
        ${state.error ? `<div class="accred-card"><span class="accred-muted">${esc(state.error)}</span></div>` : ""}
        ${state.publishedUrl ? renderShareCard() : ""}
        ${!state.user ? renderLoginState(page) : renderAuditState(dim, score, evidence, done)}
      </div>
    `;

    bind();
    renderPins();
    renderComposer();
    requestAnimationFrame(animateRender);
  }

  function renderEvidenceItem(pin, index) {
    return `<div class="accred-evidence-item">
      <div class="accred-evidence-head">
        <strong>#${index + 1}</strong>
        <button type="button" class="accred-icon-btn accred-evidence-delete" data-evidence-id="${pin.id}" data-tip="Delete evidence" aria-label="Delete evidence #${index + 1}">${icon("delete")}</button>
      </div>
      <div class="accred-evidence-body">${esc(pin.note)}<br><span class="accred-muted">${esc(pin.element_text || pin.page_url)}</span></div>
    </div>`;
  }

  function renderMobilePinHint() {
    return `
      <div class="accred-mobile-pin-hint">
        <span>Tap page to pin evidence</span>
        <button class="accred-btn" id="accred-cancel-pin">Cancel</button>
      </div>
    `;
  }

  function renderLoginState(page) {
    return `
      <div class="accred-card">
        <div class="accred-muted">Sign in from the extension popup on the website, then connect here.</div>
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
          <button class="accred-btn ${state.pinMode ? "active" : ""}" id="accred-pin-toggle" aria-pressed="${state.pinMode ? "true" : "false"}" ${!state.audit ? "disabled" : ""}>Pin</button>
          <button class="accred-btn" id="accred-publish" ${!state.audit || state.audit.status === "published" ? "disabled" : ""}>Publish</button>
        </div>
        ${state.publishOpen ? renderPublishComposer() : ""}
      </div>
      ${state.audit && state.bootstrap ? `
        ${renderMobileTabs()}
        <div class="accred-mobile-panel ${state.mobileSection === "metrics" ? "active" : ""}" data-mobile-panel="metrics">
          ${renderMetricNav(dim)}
        </div>
        ${dim ? `
          <div class="accred-mobile-panel ${state.mobileSection === "score" ? "active" : ""}" data-mobile-panel="score">
          <div class="accred-card accred-score-card">
            <div class="accred-card-title">${esc(dim.name)}</div>
            <div class="accred-muted">${esc(dim.description)}</div>
            <label class="accred-label">Score</label>
            ${renderStars(score?.score || 5)}
            <label class="accred-label">Confidence</label>
            ${renderConfidenceButtons(score?.confidence || "medium")}
            <label class="accred-label">Audit note</label>
            <textarea class="accred-textarea" id="accred-note" placeholder="Public note for this metric">${esc(score?.note || "")}</textarea>
            <div class="accred-row" style="margin-top:10px">
          <button class="accred-btn primary" id="accred-save-score">${isLastMetric() ? "Save and publish" : "Save and next"}</button>
            </div>
            ${anchorsHtml(dim)}
          </div>
          </div>
          <div class="accred-mobile-panel ${state.mobileSection === "evidence" ? "active" : ""}" data-mobile-panel="evidence">
          <div class="accred-card">
            <div class="accred-card-title">Evidence (${evidence.length})</div>
            <div class="accred-evidence-list">
              ${evidence.length ? evidence.map((pin, index) => renderEvidenceItem(pin, index)).join("") : `<div class="accred-muted">Turn on pin mode and click the page to attach evidence.</div>`}
            </div>
          </div>
          </div>
        ` : ""}
      ` : ""}
    `;
  }

  function renderMobileTabs() {
    const tabs = [
      ["score", "Score"],
      ["metrics", "Metrics"],
      ["evidence", "Evidence"]
    ];
    return `
      <div class="accred-mobile-tabs" role="tablist" aria-label="Audit sections">
        ${tabs.map(([section, label]) => `<button class="accred-mobile-tab ${state.mobileSection === section ? "active" : ""}" data-mobile-section="${section}" role="tab" aria-selected="${state.mobileSection === section ? "true" : "false"}">${label}</button>`).join("")}
      </div>
    `;
  }

  function renderPublishComposer() {
    return `
      <div class="accred-publish-compose">
        <label class="accred-label" for="accred-publish-summary">Audit summary</label>
        <textarea class="accred-textarea" id="accred-publish-summary" placeholder="Summarize the audit">${esc(state.publishSummary || DEFAULT_PUBLISH_SUMMARY)}</textarea>
        <div class="accred-row accred-actions">
          <button class="accred-btn primary" id="accred-confirm-publish">Publish audit</button>
          <button class="accred-btn" id="accred-cancel-publish">Cancel</button>
        </div>
      </div>
    `;
  }

  function renderShareCard() {
    return `
      <div class="accred-card accred-share-card">
        <div class="accred-card-title">Published link</div>
        <div class="accred-share-url">${esc(state.publishedUrl)}</div>
        <div class="accred-row accred-actions">
          <button class="accred-btn primary" id="accred-copy-link">Copy link</button>
          <button class="accred-btn" id="accred-open-link">Open</button>
        </div>
      </div>
    `;
  }

  function renderComposer() {
    const pending = state.pendingEvidence;
    const dim = selectedDim();
    if (!pending || !dim) {
      composer.classList.remove("show", "accred-mobile-compose");
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
    composer.classList.toggle("accred-mobile-compose", isMobileSurface());
    composer.classList.add("show");
    positionComposer();
    bindComposer();
    if (window.gsap && !prefersReducedMotion()) window.gsap.fromTo(composer, { autoAlpha: 0, y: 8, scale: .985 }, { autoAlpha: 1, y: 0, scale: 1, duration: .2, ease: "power2.out" });
  }

  function positionComposer() {
    if (!state.pendingEvidence || !composer.classList.contains("show")) return;
    composer.classList.toggle("accred-mobile-compose", isMobileSurface());
    if (isMobileSurface()) {
      composer.style.left = "";
      composer.style.top = "";
      composer.style.width = "";
      return;
    }
    const position = pinPosition(state.pendingEvidence);
    const margin = 12;
    const viewport = pageViewportBounds();
    const width = Math.min(286, Math.max(0, viewport.width - margin * 2));
    const left = Math.min(Math.max(position.x + 18, viewport.left + margin), viewport.left + viewport.width - width - margin);
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
      state.mobileSection = "evidence";
      if (isMobileSurface()) state.collapsed = false;
      render();
    });
    window.AccredTextDirection?.bindTextDirectionAll(composer);
    composer.querySelector("#accred-evidence-note")?.focus();
  }

  function bind() {
    root.querySelector("#accred-collapse")?.addEventListener("click", () => {
      state.collapsed = !state.collapsed;
      render();
    });
    root.querySelector("#accred-container-toggle")?.addEventListener("click", () => {
      setContainerMode(!state.containerMode);
    });
    root.querySelector("#accred-cancel-pin")?.addEventListener("click", () => {
      state.pinMode = false;
      document.body.classList.remove("accred-pin-mode");
      state.collapsed = false;
      render();
    });
    root.querySelector("#accred-connect")?.addEventListener("click", connect);
    root.querySelector("#accred-start")?.addEventListener("click", startAudit);
    root.querySelector("#accred-pin-toggle")?.addEventListener("click", () => {
      state.pinMode = !state.pinMode;
      document.body.classList.toggle("accred-pin-mode", state.pinMode);
      if (state.pinMode && isMobileSurface()) {
        closeTransientPanels();
        state.collapsed = true;
      } else if (!state.pinMode && isMobileSurface()) {
        state.collapsed = false;
      }
      render();
    });
    root.querySelector("#accred-publish")?.addEventListener("click", openPublishComposer);
    root.querySelector("#accred-confirm-publish")?.addEventListener("click", submitPublishAudit);
    root.querySelector("#accred-cancel-publish")?.addEventListener("click", () => {
      state.publishOpen = false;
      render();
    });
    root.querySelector("#accred-copy-link")?.addEventListener("click", copyPublishedLink);
    root.querySelector("#accred-open-link")?.addEventListener("click", () => {
      if (state.publishedUrl) window.open(state.publishedUrl, "_blank", "noopener,noreferrer");
    });
    root.querySelector("#accred-prev-metric")?.addEventListener("click", () => moveMetric(-1));
    root.querySelector("#accred-next-metric")?.addEventListener("click", () => moveMetric(1));
    root.querySelector("#accred-open-metrics")?.addEventListener("click", () => {
      state.metricMenuOpen = !state.metricMenuOpen;
      render();
    });
    root.querySelectorAll(".accred-metric-option").forEach((button) => {
      button.addEventListener("click", () => setSelectedDim(button.dataset.dimId));
    });
    root.querySelectorAll(".accred-mobile-tab").forEach((button) => {
      button.addEventListener("click", () => setMobileSection(button.dataset.mobileSection));
    });
    root.querySelectorAll(".accred-star").forEach((button) => {
      button.addEventListener("mouseenter", () => previewStars(Number(button.dataset.score)));
      button.addEventListener("mouseleave", resetStars);
      button.addEventListener("click", () => setStarScore(Number(button.dataset.score)));
    });
    root.querySelectorAll(".accred-confidence-buttons .confidence").forEach((button) => {
      button.addEventListener("click", () => setConfidence(button.dataset.confidence));
    });
    root.querySelectorAll(".accred-evidence-delete").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteEvidence(Number(button.dataset.evidenceId));
      });
    });
    root.querySelector("#accred-save-score")?.addEventListener("click", saveScore);
    window.AccredTextDirection?.bindTextDirectionAll(root);
    bindTooltips(root);
  }

  function bindTooltips(scope) {
    scope.querySelectorAll("[data-tip]").forEach((element) => {
      element.addEventListener("mouseenter", () => showTooltip(element));
      element.addEventListener("mouseleave", hideTooltip);
      element.addEventListener("focus", () => showTooltip(element));
      element.addEventListener("blur", hideTooltip);
    });
  }

  function showTooltip(element) {
    if (isMobileSurface()) return;
    const text = element?.dataset?.tip;
    if (!text) return;
    tooltip.textContent = text;
    tooltip.classList.add("show");
    const rect = element.getBoundingClientRect();
    const margin = 8;
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = Math.min(Math.max(rect.left + rect.width / 2 - tooltipRect.width / 2, margin), window.innerWidth - tooltipRect.width - margin);
    const top = Math.max(rect.top - tooltipRect.height - 8, margin);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    if (window.gsap && !prefersReducedMotion()) window.gsap.fromTo(tooltip, { autoAlpha: 0, y: 3 }, { autoAlpha: 1, y: 0, duration: .12, ease: "power1.out" });
  }

  function hideTooltip() {
    tooltip.classList.remove("show");
  }

  function paintStars(value, preview = false) {
    const holder = root.querySelector(".accred-stars");
    if (!holder) return;
    holder.querySelectorAll(".accred-star").forEach((button) => {
      button.classList.toggle("on", Number(button.dataset.score) <= value);
      button.classList.toggle("preview", preview && Number(button.dataset.score) <= value);
      button.setAttribute("aria-pressed", Number(button.dataset.score) === value ? "true" : "false");
    });
    const output = holder.querySelector("#accred-score-out");
    if (output) output.textContent = `${value}/10`;
  }

  function previewStars(value) {
    paintStars(value, true);
    if (!window.gsap || prefersReducedMotion()) return;
    const stars = Array.from(root.querySelectorAll(".accred-star")).filter((button) => Number(button.dataset.score) <= value);
    window.gsap.killTweensOf(root.querySelectorAll(".accred-star"));
    window.gsap.to(stars, { scale: 1.08, duration: .12, stagger: .006, ease: "power1.out" });
  }

  function resetStars() {
    const holder = root.querySelector(".accred-stars");
    paintStars(Number(holder?.dataset.value) || 5);
    if (window.gsap && !prefersReducedMotion()) window.gsap.to(root.querySelectorAll(".accred-star"), { scale: 1, duration: .1, ease: "power1.out" });
  }

  function setStarScore(value) {
    const holder = root.querySelector(".accred-stars");
    if (!holder) return;
    holder.dataset.value = String(value);
    paintStars(value);
    if (window.gsap && !prefersReducedMotion()) window.gsap.fromTo(holder.querySelectorAll(".accred-star.on"), { scale: .96 }, { scale: 1, duration: .14, stagger: .006, ease: "power1.out" });
  }

  function setConfidence(value) {
    const holder = root.querySelector(".accred-confidence-buttons");
    if (!holder || !value) return;
    holder.dataset.value = value;
    holder.querySelectorAll(".confidence").forEach((button) => button.classList.toggle("active", button.dataset.confidence === value));
    holder.querySelectorAll(".confidence").forEach((button) => button.setAttribute("aria-pressed", button.dataset.confidence === value ? "true" : "false"));
    if (window.gsap && !prefersReducedMotion()) window.gsap.fromTo(holder.querySelector(".confidence.active"), { scale: .9 }, { scale: 1, duration: .18, ease: "back.out(2)" });
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
    const wasLastMetric = isLastMetric();
    const previousMetricId = Number(state.selectedDimId);
    const score = Number(root.querySelector(".accred-stars")?.dataset.value || 5);
    const note = root.querySelector("#accred-note")?.value || "";
    const confidence = root.querySelector(".accred-confidence-buttons")?.dataset.value || "medium";
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
      await animateScoreSaved();
      if (wasLastMetric) {
        openPublishComposer();
        return;
      }
      const dims = state.bootstrap?.dimensions || [];
      const previousIndex = dims.findIndex((dim) => dim.id === previousMetricId);
      const next = dims[previousIndex + 1];
      if (next) {
        state.selectedDimId = next.id;
        state.metricMenuOpen = false;
        render();
      }
    } catch (error) {
      state.error = error.message;
      render();
    }
  }

  function animateScoreSaved() {
    if (!window.gsap || prefersReducedMotion()) return Promise.resolve();
    const card = root.querySelector(".accred-score-card");
    const button = root.querySelector("#accred-save-score");
    return new Promise((resolve) => {
      window.gsap.timeline({ onComplete: resolve })
        .to(button, { scale: .96, duration: .08, ease: "power1.out" })
        .to(button, { scale: 1, duration: .14, ease: "back.out(2)" })
        .to(card, { boxShadow: "0 0 0 1px rgba(113, 113, 122, 0.45)", duration: .12, ease: "power1.out" }, 0)
        .to(card, { boxShadow: "0 0 0 0 transparent", duration: .18, ease: "power1.out" });
    });
  }

  async function deleteEvidence(evidenceId) {
    if (!state.audit || !evidenceId) return;
    state.error = "";
    try {
      await api("DELETE", `/api/extension/audits/${state.audit.id}/evidence/${evidenceId}`);
      state.evidence = state.evidence.filter((pin) => pin.id !== Number(evidenceId));
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
      state.mobileSection = "evidence";
      if (isMobileSurface()) state.collapsed = false;
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  function openPublishComposer() {
    if (!state.audit || state.audit.status === "published") return;
    state.publishSummary ||= DEFAULT_PUBLISH_SUMMARY;
    state.publishOpen = true;
    state.collapsed = false;
    render();
    root.querySelector("#accred-publish-summary")?.focus();
  }

  async function submitPublishAudit() {
    if (!state.audit || state.audit.status === "published") return;
    const summary = root.querySelector("#accred-publish-summary")?.value?.trim() || DEFAULT_PUBLISH_SUMMARY;
    state.publishSummary = summary;
    state.error = "";
    try {
      const data = await api("POST", `/api/extension/audits/${state.audit.id}/submit`, { summary });
      state.audit = data.audit || state.audit;
      const apiBase = await getApiBase();
      state.publishedUrl = normalizePublicAuditUrl(data.public_url || "", state.audit?.id, apiBase);
      state.pinMode = false;
      state.publishOpen = false;
      document.body.classList.remove("accred-pin-mode");
      state.error = `Published: ${data.overall_score}/100 ${data.tier}`;
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  async function copyPublishedLink() {
    if (!state.publishedUrl) return;
    try {
      await navigator.clipboard.writeText(state.publishedUrl);
      state.error = "Published link copied.";
    } catch {
      state.error = state.publishedUrl;
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
      const className = firstClassToken(node);
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

  function firstClassToken(element) {
    if (!(element instanceof Element)) return "";
    const fromList = element.classList && element.classList.length ? element.classList[0] : "";
    const raw = fromList || element.getAttribute("class") || "";
    const token = String(raw).trim().split(/\s+/).find((item) => item && item !== "[object" && !item.includes("SVGAnimatedString"));
    return token || "";
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
        const child = Array.from(node.children)[index] || null;
        node = child && child.nodeName.toLowerCase() === tag ? child : null;
      }
      if (!node) return null;
    }
    return node;
  }

  function resolveNearestDomPath(path) {
    if (!path) return null;
    const parts = String(path).split(".");
    for (let end = parts.length; end > 0; end -= 1) {
      const node = resolveDomPath(parts.slice(0, end).join("."));
      if (node) return node;
    }
    return null;
  }

  function resolvePinElement(pin) {
    if (pin === state.pendingEvidence && state.pendingElement?.isConnected) return state.pendingElement;
    if (pin.selector) {
      try {
        const element = document.querySelector(pin.selector);
        if (element) return element;
      } catch {}
    }
    const exact = resolveDomPath(pin.dom_path);
    if (exact) return exact;
    const nearest = resolveNearestDomPath(pin.dom_path);
    if (!nearest || !pin.dom_path) return nearest;
    const last = String(pin.dom_path).split(".").at(-1);
    const tag = last?.match(/^([a-z0-9-]+)\[/i)?.[1];
    if (!tag) return nearest;
    return nearest.querySelector?.(tag) || nearest;
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
    state.mobileSection = "evidence";
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
      if (animate && window.gsap && !prefersReducedMotion()) window.gsap.fromTo(el, { scale: .55, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .24, ease: "back.out(2)" });
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
      if (animate && window.gsap && !prefersReducedMotion()) window.gsap.fromTo(el, { scale: .55, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .24, ease: "back.out(2)" });
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
    const currentMobileSurface = isMobileSurface();
    if (currentMobileSurface !== lastMobileSurface) {
      syncViewportClass();
      render();
      return;
    }
    if (containerModeActive()) syncViewportClass();
  });
  window.visualViewport?.addEventListener("resize", () => {
    renderPins(false);
    positionComposer();
  });
  window.visualViewport?.addEventListener("scroll", () => {
    renderPins(false);
    positionComposer();
  });

  loadContainerMode().then(() => {
    render();
    connect();
  });
})();
