import postgres from "postgres";

type Platform = "ig" | "fb";
type ApplicationStatus = "pending" | "in_progress" | "completed" | "rejected";
type AuditStatus = "draft" | "published";

type Category = {
  id: number;
  key: string;
  name: string;
  weight: number;
  sort: number;
};

type Dimension = {
  id: number;
  category_key: string;
  name: string;
  description: string;
  sort: number;
};

type Brand = {
  id: number;
  name: string;
  platform: Platform;
  handle: string;
  url: string;
  contact_email: string;
  niche: string;
  created_at: number;
};

type Application = {
  id: number;
  brand_id: number;
  type: "new" | "reaudit";
  status: ApplicationStatus;
  changes_note: string;
  created_at: number;
  why?: string;
  prior_audit_id?: number;
  claimed_by?: string;
  reject_reason?: string;
};

type Audit = {
  id: number;
  brand_id: number;
  auditor: string;
  rubric_version_id: number;
  weights_version_id: number;
  status: AuditStatus;
  overall_score: number;
  tier: string;
  summary: string;
  created_at: number;
  published_at?: number;
  source?: "admin" | "extension" | "import";
  submitted_at?: number;
};

type AuditScore = {
  dim_id: number;
  score: number;
  note: string;
  confidence?: "low" | "medium" | "high";
  evidence_count?: number;
  updated_at?: number;
};

type EvidencePin = {
  id: number;
  audit_id: number;
  dim_id: number;
  author: string;
  platform: Platform;
  page_url: string;
  selector: string;
  dom_path: string;
  x: number;
  y: number;
  offset_x_ratio?: number;
  offset_y_ratio?: number;
  viewport_width: number;
  viewport_height: number;
  element_text: string;
  note: string;
  visibility: "private" | "brand-visible" | "public";
  status: "open" | "resolved" | "detached";
  created_at: number;
  updated_at: number;
};

type AppState = {
  categories: Category[];
  dimensions: Dimension[];
  rubric_versions: Array<{ id: number; created_at: number; notes: string }>;
  rubric_anchors: Record<string, Record<string, { anchor_1: string; anchor_5: string; anchor_10: string }>>;
  weights_versions: Array<{ id: number; weights: Record<string, number> }>;
  brands: Brand[];
  applications: Application[];
  audits: Audit[];
  audit_scores: Record<string, AuditScore[]>;
  evidence_pins: EvidencePin[];
  users?: Array<{ name: string; role: string; email: string }>;
  nextId: number;
};

const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "roaster";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const htmlFile = Bun.file("artifact/index.html");
const rateLimitByEmail = new Map<string, number>();

const TIERS = [
  { key: "plat", name: "Platinum", min: 90, col: "#3a7bd5" },
  { key: "gld", name: "Gold", min: 80, col: "#c79a3b" },
  { key: "slv", name: "Silver", min: 70, col: "#8b8b8b" },
  { key: "brz", name: "Bronze", min: 60, col: "#a8662d" },
  { key: "roast", name: "Needs Roasting", min: 0, col: "#e8482b" },
];

const SEED_CATEGORIES = [
  { key: "foundation", name: "Brand Foundation", weight: 20, sort: 1 },
  { key: "exposure", name: "Exposure", weight: 20, sort: 2 },
  { key: "influence", name: "Influence", weight: 30, sort: 3 },
  { key: "conversion", name: "Conversion", weight: 30, sort: 4 },
];

const SEED_DIMS = [
  ["foundation", "Positioning", "Is the brand's reason-to-exist instantly legible?"],
  ["foundation", "Identity Coherence", "Visual + verbal identity consistent across the feed."],
  ["foundation", "Strategic Real Estate", "Bio, link, highlights, pinned content used deliberately."],
  ["exposure", "Hook-to-Value Ratio", "Do openers earn the scroll-stop and pay it off?"],
  ["exposure", "Pace Consistency", "Steady cadence without dead zones or spam bursts."],
  ["exposure", "Overall Brand Exposure", "Reach footprint relative to niche."],
  ["exposure", "Frequency", "Posting volume sufficient to stay top-of-mind."],
  ["influence", "Value Density", "Useful substance per unit of attention spent."],
  ["influence", "Parasocial Depth", "Strength of the audience's felt relationship."],
  ["influence", "Comment-to-Reaction Rate", "Conversation vs. passive likes."],
  ["influence", "Engagement Rate", "Interactions relative to reach."],
  ["conversion", "Clear Selling Proposition", "Is what they sell obvious?"],
  ["conversion", "Clear Objection Handling", "Are doubts pre-empted in content?"],
  ["conversion", "Clear Offer", "Is there a defined, compelling next step?"],
  ["conversion", "Response Time", "Speed of reply to DMs/comments."],
  ["conversion", "Response Quality", "Helpfulness and tone of replies."],
] as const;

const SEED_ANCHORS: Record<string, [string, string, string]> = {
  Positioning: ["Generic; could be any brand in the niche.", "Recognisable angle but inconsistently expressed.", "Owns a sharp, defensible position you remember."],
  "Identity Coherence": ["Visuals/voice clash post to post.", "Mostly consistent with occasional drift.", "Unmistakable system; you'd ID it with the logo cropped."],
  "Strategic Real Estate": ["Bio/link/pins empty or wasted.", "Some assets used, others neglected.", "Every fixed asset earns its place and converts."],
  "Hook-to-Value Ratio": ["Hooks absent or clickbait with no payoff.", "Decent hooks, uneven payoff.", "Hooks stop the scroll and the value lands every time."],
  "Pace Consistency": ["Erratic - famine then flood.", "Roughly regular with gaps.", "Metronomic, reliable rhythm."],
  "Overall Brand Exposure": ["Near-invisible for the niche.", "Moderate, niche-typical reach.", "Category-leading footprint."],
  Frequency: ["Too sparse to build memory.", "Adequate but could compound faster.", "Optimal volume for the format & audience."],
  "Value Density": ["Filler; little to take away.", "Useful but padded.", "Every post is a keeper - high signal."],
  "Parasocial Depth": ["Audience feels nothing personal.", "Some warmth and recognition.", "Audience feels they truly know the brand/person."],
  "Comment-to-Reaction Rate": ["Likes only; no conversation.", "Some discussion threads.", "Comments rival or exceed reactions - real dialogue."],
  "Engagement Rate": ["Far below niche benchmark.", "Around niche benchmark.", "Top-decile engagement for the niche."],
  "Clear Selling Proposition": ["Unclear what they even sell.", "Sellable but you must dig.", "Crystal clear what they offer and why it wins."],
  "Clear Objection Handling": ["Doubts never addressed.", "Some objections touched.", "Objections pre-empted and dismantled in content."],
  "Clear Offer": ["No next step anywhere.", "Offer exists but buried.", "Compelling, obvious, low-friction next step."],
  "Response Time": ["Days, or no reply.", "Within ~24h.", "Near-instant, within the hour."],
  "Response Quality": ["Curt, templated, unhelpful.", "Helpful but generic.", "Personal, on-brand, genuinely useful replies."],
};

function tierFor(score: number) {
  return TIERS.find((tier) => score >= tier.min) || TIERS[TIERS.length - 1]!;
}

function activeWeights(db: AppState, weightsVersionId: number) {
  return db.weights_versions.find((version) => version.id === weightsVersionId)?.weights || db.weights_versions.at(-1)?.weights || {};
}

function computeOverall(scoreArr: Array<{ dim_id: number; score: number }>, db: AppState, weightsVersionId: number) {
  const weights = activeWeights(db, weightsVersionId);
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0) || 1;
  let final = 0;

  for (const category of db.categories) {
    const dimensions = db.dimensions.filter((dimension) => dimension.category_key === category.key);
    let sum = 0;
    let count = 0;

    for (const dimension of dimensions) {
      const score = scoreArr.find((item) => item.dim_id === dimension.id);
      sum += score?.score || 0;
      count += 1;
    }

    const average = count ? sum / count : 0;
    final += (average / 10) * ((weights[category.key] || 0) / totalWeight) * 100;
  }

  return Math.round(final);
}

function freshDB(): AppState {
  const categories = SEED_CATEGORIES.map((category, index) => ({ id: index + 1, ...category }));
  const dimensions = SEED_DIMS.map((dimension, index) => ({
    id: index + 1,
    category_key: dimension[0],
    name: dimension[1],
    description: dimension[2],
    sort: index + 1,
  }));
  const anchors: AppState["rubric_anchors"][string] = {};

  for (const dimension of dimensions) {
    const seed = SEED_ANCHORS[dimension.name] || ["", "", ""];
    anchors[String(dimension.id)] = {
      anchor_1: seed[0],
      anchor_5: seed[1],
      anchor_10: seed[2],
    };
  }

  const db: AppState = {
    categories,
    dimensions,
    rubric_versions: [{ id: 1, created_at: Date.now(), notes: "Initial rubric v1" }],
    rubric_anchors: { "1": anchors },
    weights_versions: [{ id: 1, weights: Object.fromEntries(categories.map((category) => [category.key, category.weight])) }],
    brands: [],
    applications: [],
    audits: [],
    audit_scores: {},
    evidence_pins: [],
    users: [{ name: "Roaster", role: "admin", email: "roaster@accreditation.io" }],
    nextId: 1,
  };

  return db;
}

function normalizeState(state: AppState) {
  state.evidence_pins ||= [];
  state.audit_scores ||= {};
  state.users ||= [{ name: "Roaster", role: "admin", email: "roaster@accreditation.io" }];
  return state;
}

type Store = {
  get(): Promise<AppState>;
  set(state: AppState): Promise<void>;
  mutate(mutator: (state: AppState) => void | AppState): Promise<AppState>;
};

function createMemoryStore(): Store {
  let state = freshDB();
  let queue = Promise.resolve();
  return {
    async get() {
      return structuredClone(normalizeState(state));
    },
    async set(nextState) {
      state = structuredClone(normalizeState(nextState));
    },
    async mutate(mutator) {
      const task = queue.then(async () => {
        const working = structuredClone(normalizeState(state));
        const result = mutator(working);
        state = structuredClone(normalizeState(result || working));
        return structuredClone(state);
      });
      queue = task.then(() => undefined, () => undefined);
      return task;
    },
  };
}

async function createPostgresStore(databaseUrl: string): Promise<Store> {
  const sql = postgres(databaseUrl, { max: 4 });
  await sql`
    create table if not exists app_state (
      id integer primary key check (id = 1),
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;

  const existing = await sql<Array<{ count: string }>>`select count(*)::text as count from app_state where id = 1`;
  if (existing[0]?.count !== "1") {
    await sql`insert into app_state (id, data) values (1, ${sql.json(freshDB())})`;
  }

  let queue = Promise.resolve();

  return {
    async get() {
      const rows = await sql<Array<{ data: AppState }>>`select data from app_state where id = 1`;
      return normalizeState(rows[0]?.data || freshDB());
    },
    async set(state) {
      normalizeState(state);
      await sql`
        insert into app_state (id, data, updated_at)
        values (1, ${sql.json(state)}, now())
        on conflict (id) do update set data = excluded.data, updated_at = now()
      `;
    },
    async mutate(mutator) {
      const task = queue.then(async () => {
        const rows = await sql<Array<{ data: AppState }>>`select data from app_state where id = 1`;
        const working = normalizeState(rows[0]?.data || freshDB());
        const result = mutator(working);
        const nextState = normalizeState(result || working);
        await sql`
          update app_state
          set data = ${sql.json(nextState)}, updated_at = now()
          where id = 1
        `;
        return nextState;
      });
      queue = task.then(() => undefined, () => undefined);
      return task;
    },
  };
}

const store = process.env.DATABASE_URL
  ? await createPostgresStore(process.env.DATABASE_URL)
  : createMemoryStore();

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set; using in-memory state for this process.");
}

function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
      ...(init.headers || {}),
    },
  });
}

function emptyCorsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
    },
  });
}

async function parseJson(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isAuthed(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  const decoded = atob(auth.slice("Basic ".length));
  const splitAt = decoded.indexOf(":");
  const user = decoded.slice(0, splitAt);
  const pass = decoded.slice(splitAt + 1);
  return user === ADMIN_USERNAME && pass === ADMIN_PASSWORD;
}

function authUser(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return "";
  const decoded = atob(auth.slice("Basic ".length));
  const splitAt = decoded.indexOf(":");
  return decoded.slice(0, splitAt) || ADMIN_USERNAME;
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function handleFrom(url: string) {
  try {
    const parsed = new URL(url);
    const profile = parsed.pathname.replace(/\//g, "") || "profile";
    return parsed.hostname.includes("instagram") ? `@${profile}` : profile;
  } catch {
    return "profile";
  }
}

function normalizeHandle(value: unknown, platform: Platform, url = "") {
  const raw = cleanText(value).replace(/^@/, "");
  if (raw) return platform === "ig" ? `@${raw}` : raw;
  return handleFrom(url);
}

function activeRubricVersion(db: AppState) {
  return db.rubric_versions.at(-1)?.id || 1;
}

function activeWeightsVersion(db: AppState) {
  return db.weights_versions.at(-1)?.id || 1;
}

function validateState(state: AppState) {
  const errors: string[] = [];
  if (!Array.isArray(state.categories)) errors.push("categories must be an array");
  if (!Array.isArray(state.dimensions)) errors.push("dimensions must be an array");
  if (!Array.isArray(state.brands)) errors.push("brands must be an array");
  if (!Array.isArray(state.applications)) errors.push("applications must be an array");
  if (!Array.isArray(state.audits)) errors.push("audits must be an array");
  if (!state.audit_scores || typeof state.audit_scores !== "object") errors.push("audit_scores must be an object");
  if (!Array.isArray(state.evidence_pins)) state.evidence_pins = [];
  if (!Number.isFinite(state.nextId)) errors.push("nextId must be a number");

  for (const application of state.applications || []) {
    if (!["pending", "in_progress", "completed", "rejected"].includes(application.status)) {
      errors.push(`invalid application status: ${application.status}`);
      break;
    }
  }

  for (const audit of state.audits || []) {
    if (!["draft", "published"].includes(audit.status)) {
      errors.push(`invalid audit status: ${audit.status}`);
      break;
    }
  }

  for (const scores of Object.values(state.audit_scores || {})) {
    for (const score of scores || []) {
      if (!Number.isInteger(score.score) || score.score < 1 || score.score > 10) {
        errors.push("audit scores must be integers from 1 to 10");
        return errors;
      }
    }
  }

  return errors;
}

function extensionBootstrap(db: AppState) {
  const rubricVersionId = activeRubricVersion(db);
  const weightsVersionId = activeWeightsVersion(db);
  return {
    categories: db.categories,
    dimensions: db.dimensions,
    rubric_version_id: rubricVersionId,
    rubric_anchors: db.rubric_anchors[String(rubricVersionId)] || {},
    weights_version_id: weightsVersionId,
    weights: activeWeights(db, weightsVersionId),
    tiers: TIERS,
  };
}

async function extensionLogin(request: Request) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const user = authUser(request);
  return json({
    ok: true,
    user: { name: user || "Roaster", role: user === ADMIN_USERNAME ? "admin" : "auditor" },
    bootstrap: extensionBootstrap(await store.get()),
  });
}

async function extensionBootstrapRoute(request: Request) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  return json({ ok: true, bootstrap: extensionBootstrap(await store.get()) });
}

async function extensionResolveBrand(request: Request) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const platform = cleanText(body?.platform) as Platform;
  const url = cleanText(body?.url);
  const detectedName = cleanText(body?.detected_name) || cleanText(body?.name);
  const niche = cleanText(body?.niche) || "Uncategorized";
  const contactEmail = cleanText(body?.contact_email).toLowerCase() || "extension@accreditation.local";
  const errors: string[] = [];

  if (!["ig", "fb"].includes(platform)) errors.push("Platform must be ig or fb.");
  if (!/^https?:\/\/(www\.)?(facebook|instagram)\.com\//i.test(url)) errors.push("URL must be an Instagram or Facebook page.");
  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  const handle = normalizeHandle(body?.handle, platform, url);
  let brandId = 0;
  let created = false;
  const state = await store.mutate((db) => {
    const existing = db.brands.find((brand) => brand.platform === platform && (brand.handle.toLowerCase() === handle.toLowerCase() || brand.url === url));
    if (existing) {
      existing.url = url || existing.url;
      if (detectedName && existing.name === existing.handle) existing.name = detectedName;
      brandId = existing.id;
      return;
    }

    brandId = db.nextId++;
    created = true;
    db.brands.push({
      id: brandId,
      name: detectedName || handle,
      platform,
      handle,
      url,
      contact_email: contactEmail,
      niche,
      created_at: Date.now(),
    });
  });

  return json({ ok: true, brand_id: brandId, created, brand: state.brands.find((brand) => brand.id === brandId) });
}

async function extensionCreateAudit(request: Request) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const brandId = Number(body?.brand_id);
  const auditor = authUser(request) || "Roaster";
  let auditId = 0;

  const state = await store.mutate((db) => {
    const brand = db.brands.find((item) => item.id === brandId);
    if (!brand) return;

    const existing = db.audits.find((audit) => audit.brand_id === brandId && audit.status === "draft" && audit.source === "extension");
    if (existing) {
      auditId = existing.id;
      return;
    }

    auditId = db.nextId++;
    db.audits.push({
      id: auditId,
      brand_id: brandId,
      auditor,
      rubric_version_id: Number(body?.rubric_version_id) || activeRubricVersion(db),
      weights_version_id: Number(body?.weights_version_id) || activeWeightsVersion(db),
      status: "draft",
      overall_score: 0,
      tier: "roast",
      summary: "",
      created_at: Date.now(),
      source: "extension",
    });
    db.audit_scores[String(auditId)] = [];
  });

  if (!auditId) return json({ ok: false, errors: ["Brand not found"] }, { status: 404 });
  const audit = state.audits.find((item) => item.id === auditId);
  return json({
    ok: true,
    audit,
    scores: state.audit_scores[String(auditId)] || [],
    evidence: state.evidence_pins.filter((pin) => pin.audit_id === auditId),
    bootstrap: extensionBootstrap(state),
  });
}

async function extensionGetAudit(request: Request, auditId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const state = await store.get();
  const audit = state.audits.find((item) => item.id === auditId);
  if (!audit) return json({ ok: false, errors: ["Audit not found"] }, { status: 404 });
  return json({
    ok: true,
    audit,
    brand: state.brands.find((brand) => brand.id === audit.brand_id),
    scores: state.audit_scores[String(auditId)] || [],
    evidence: state.evidence_pins.filter((pin) => pin.audit_id === auditId),
    bootstrap: extensionBootstrap(state),
  });
}

async function extensionSaveScore(request: Request, auditId: number, dimId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const score = Number(body?.score);
  const note = cleanText(body?.note);
  const confidence = cleanText(body?.confidence) as AuditScore["confidence"];
  const errors: string[] = [];

  if (!Number.isInteger(score) || score < 1 || score > 10) errors.push("Score must be an integer from 1 to 10.");
  if (note.length > 1200) errors.push("Note is too long.");
  if (confidence && !["low", "medium", "high"].includes(confidence)) errors.push("Invalid confidence.");
  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  let saved: AuditScore | undefined;
  const state = await store.mutate((db) => {
    const audit = db.audits.find((item) => item.id === auditId && item.status === "draft");
    const dimension = db.dimensions.find((item) => item.id === dimId);
    if (!audit || !dimension) return;

    const scores = (db.audit_scores[String(auditId)] ||= []);
    const existing = scores.find((item) => item.dim_id === dimId);
    const evidenceCount = db.evidence_pins.filter((pin) => pin.audit_id === auditId && pin.dim_id === dimId).length;
    saved = {
      dim_id: dimId,
      score,
      note,
      confidence: confidence || "medium",
      evidence_count: evidenceCount,
      updated_at: Date.now(),
    };

    if (existing) Object.assign(existing, saved);
    else scores.push(saved);

    audit.overall_score = computeOverall(scores, db, audit.weights_version_id);
    audit.tier = tierFor(audit.overall_score).key;
  });

  if (!saved) return json({ ok: false, errors: ["Draft audit or dimension not found"] }, { status: 404 });
  return json({ ok: true, score: saved, audit: state.audits.find((item) => item.id === auditId) });
}

async function extensionCreateEvidence(request: Request, auditId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const dimId = Number(body?.dim_id);
  const visibility = cleanText(body?.visibility) as EvidencePin["visibility"];
  const platform = cleanText(body?.platform) as Platform;
  const errors: string[] = [];

  if (!Number.isInteger(dimId)) errors.push("Missing metric dimension.");
  if (!["ig", "fb"].includes(platform)) errors.push("Platform must be ig or fb.");
  if (visibility && !["private", "brand-visible", "public"].includes(visibility)) errors.push("Invalid visibility.");
  if (cleanText(body?.note).length < 2) errors.push("Evidence note is required.");
  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  let pin: EvidencePin | undefined;
  const state = await store.mutate((db) => {
    const audit = db.audits.find((item) => item.id === auditId && item.status === "draft");
    const dimension = db.dimensions.find((item) => item.id === dimId);
    if (!audit || !dimension) return;

    pin = {
      id: db.nextId++,
      audit_id: auditId,
      dim_id: dimId,
      author: authUser(request) || "Roaster",
      platform,
      page_url: cleanText(body?.page_url).slice(0, 500),
      selector: cleanText(body?.selector).slice(0, 500),
      dom_path: cleanText(body?.dom_path).slice(0, 1000),
      x: Number(body?.x) || 0,
      y: Number(body?.y) || 0,
      offset_x_ratio: Number.isFinite(Number(body?.offset_x_ratio)) ? Number(body?.offset_x_ratio) : undefined,
      offset_y_ratio: Number.isFinite(Number(body?.offset_y_ratio)) ? Number(body?.offset_y_ratio) : undefined,
      viewport_width: Number(body?.viewport_width) || 0,
      viewport_height: Number(body?.viewport_height) || 0,
      element_text: cleanText(body?.element_text).slice(0, 500),
      note: cleanText(body?.note).slice(0, 1200),
      visibility: visibility || "private",
      status: "open",
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    db.evidence_pins.push(pin);
    const score = (db.audit_scores[String(auditId)] || []).find((item) => item.dim_id === dimId);
    if (score) score.evidence_count = db.evidence_pins.filter((item) => item.audit_id === auditId && item.dim_id === dimId).length;
  });

  if (!pin) return json({ ok: false, errors: ["Draft audit or dimension not found"] }, { status: 404 });
  return json({ ok: true, evidence: pin, audit: state.audits.find((item) => item.id === auditId) });
}

async function extensionListEvidence(request: Request, auditId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const state = await store.get();
  return json({ ok: true, evidence: state.evidence_pins.filter((pin) => pin.audit_id === auditId) });
}

async function extensionSubmitAudit(request: Request, auditId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const summary = cleanText(body?.summary);
  const errors: string[] = [];
  let publishedAudit: Audit | undefined;

  const state = await store.mutate((db) => {
    const audit = db.audits.find((item) => item.id === auditId && item.status === "draft");
    if (!audit) {
      errors.push("Draft audit not found.");
      return;
    }

    const scores = db.audit_scores[String(auditId)] || [];
    if (summary.length > 1200) errors.push("Summary is too long.");
    if (errors.length) return;

    const overall = computeOverall(scores, db, audit.weights_version_id);
    audit.status = "published";
    audit.overall_score = overall;
    audit.tier = tierFor(overall).key;
    audit.summary = summary || "Audited from the live page with extension evidence.";
    audit.submitted_at = Date.now();
    audit.published_at = Date.now();
    publishedAudit = audit;
  });

  if (errors.length) return json({ ok: false, errors }, { status: 400 });
  return json({
    ok: true,
    audit: publishedAudit,
    status: "published",
    overall_score: publishedAudit?.overall_score,
    tier: publishedAudit ? tierFor(publishedAudit.overall_score).name : undefined,
    public_url: publishedAudit ? `${new URL(request.url).origin}/#audit/${publishedAudit.id}` : undefined,
    state,
  });
}

async function createApplication(request: Request) {
  const body = await parseJson(request);
  const brandName = cleanText(body?.brandName);
  const platform = cleanText(body?.platform) as Platform;
  const url = cleanText(body?.url);
  const email = cleanText(body?.email).toLowerCase();
  const niche = cleanText(body?.niche);
  const why = cleanText(body?.why);
  const honeypot = cleanText(body?.honeypot);
  const errors: string[] = [];

  if (honeypot) return json({ ok: true });
  if (brandName.length < 2 || brandName.length > 80) errors.push("Brand name looks off.");
  if (!["ig", "fb"].includes(platform)) errors.push("Choose Instagram or Facebook.");
  if (!/^https?:\/\/(www\.)?(facebook|instagram)\.com\//i.test(url)) errors.push("Profile URL must be a facebook.com or instagram.com link.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("Enter a valid email.");
  if (niche.length < 2) errors.push("Tell us your niche.");
  if (why.length < 10) errors.push("Give us a sentence on why you want it.");

  const lastSubmission = rateLimitByEmail.get(email);
  if (lastSubmission && Date.now() - lastSubmission < 60000) {
    errors.push("Slow down - you just applied. Try again shortly.");
  }

  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  const state = await store.mutate((db) => {
    const brandId = db.nextId++;
    db.brands.push({
      id: brandId,
      name: brandName,
      platform,
      handle: handleFrom(url),
      url,
      contact_email: email,
      niche,
      created_at: Date.now(),
    });
    db.applications.push({
      id: db.nextId++,
      brand_id: brandId,
      type: "new",
      status: "pending",
      changes_note: "",
      why,
      created_at: Date.now(),
    });
  });

  rateLimitByEmail.set(email, Date.now());
  return json({ ok: true, state });
}

async function createReaudit(request: Request) {
  const body = await parseJson(request);
  const auditId = Number(body?.auditId);
  const email = cleanText(body?.email).toLowerCase();
  const changesNote = cleanText(body?.changesNote);
  const errors: string[] = [];
  const current = await store.get();
  const audit = current.audits.find((item) => item.id === auditId && item.status === "published");
  const brand = audit ? current.brands.find((item) => item.id === audit.brand_id) : null;

  if (!audit || !brand) errors.push("Can't request a re-audit for that.");
  if (audit?.published_at && (Date.now() - audit.published_at) / 86400000 < 30) errors.push("Too soon - 30-day cooldown.");
  if (brand && email !== brand.contact_email.toLowerCase()) errors.push("Email must match the one on the original audit.");
  if (changesNote.length < 15) errors.push("Tell us what changed (a real sentence).");

  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  const state = await store.mutate((db) => {
    db.applications.push({
      id: db.nextId++,
      brand_id: brand!.id,
      type: "reaudit",
      status: "pending",
      prior_audit_id: auditId,
      changes_note: changesNote,
      created_at: Date.now(),
    });
  });

  return json({ ok: true, state });
}

async function saveAdminState(request: Request) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });

  const body = await parseJson(request);
  const state = body?.state as AppState | undefined;
  if (!state) return json({ ok: false, errors: ["Missing state"] }, { status: 400 });

  const errors = validateState(state);
  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  await store.set(state);
  return json({ ok: true, state });
}

function adminLogin(request: Request) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  return json({ ok: true });
}

async function resetAdminState(request: Request) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const state = freshDB();
  await store.set(state);
  return json({ ok: true, state });
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

async function badgeSvg(auditId: number) {
  const db = await store.get();
  const audit = db.audits.find((item) => item.id === auditId && item.status === "published");
  const brand = audit ? db.brands.find((item) => item.id === audit.brand_id) : null;
  if (!audit || !brand) return new Response("Not found", { status: 404 });

  const tier = tierFor(audit.overall_score);
  const safeBrand = escapeXml(brand.name).slice(0, 24);
  const svg = `<svg width="220" height="92" viewBox="0 0 220 92" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Accreditation badge">
  <rect x="1" y="1" width="218" height="90" rx="16" fill="#0a0b0d" stroke="#26282e" stroke-width="1.5"/>
  <circle cx="47" cy="46" r="27" fill="none" stroke="${tier.col}" stroke-width="2.5" opacity="0.35"/>
  <circle cx="47" cy="46" r="27" fill="none" stroke="${tier.col}" stroke-width="2.5" stroke-dasharray="${Math.round(audit.overall_score / 100 * 170)} 999" stroke-linecap="round" transform="rotate(-90 47 46)"/>
  <text x="47" y="49" text-anchor="middle" font-family="Geist,system-ui,sans-serif" font-weight="600" font-size="23" fill="#f2f3f5">${audit.overall_score}</text>
  <text x="86" y="33" font-family="Geist Mono,monospace" font-size="7.5" letter-spacing="1.5" fill="#6b6f7a">THE ACCREDITATION</text>
  <text x="86" y="53" font-family="Geist,system-ui,sans-serif" font-weight="600" font-size="17" letter-spacing="-0.5" fill="${tier.col}">${escapeXml(tier.name)}</text>
  <text x="86" y="69" font-family="Geist,system-ui,sans-serif" font-size="9" fill="#a4a8b2">${safeBrand} · #${audit.id}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return emptyCorsResponse();
    if (url.pathname === "/healthz") return json({ ok: true });
    if (url.pathname === "/api/state" && request.method === "GET") return json(await store.get());
    if (url.pathname === "/api/applications" && request.method === "POST") return createApplication(request);
    if (url.pathname === "/api/reaudits" && request.method === "POST") return createReaudit(request);
    if (url.pathname === "/api/admin/login" && request.method === "POST") return adminLogin(request);
    if (url.pathname === "/api/admin/state" && request.method === "POST") return saveAdminState(request);
    if (url.pathname === "/api/admin/reset" && request.method === "POST") return resetAdminState(request);
    if (url.pathname === "/api/extension/login" && request.method === "POST") return extensionLogin(request);
    if (url.pathname === "/api/extension/bootstrap" && request.method === "GET") return extensionBootstrapRoute(request);
    if (url.pathname === "/api/extension/brands/resolve" && request.method === "POST") return extensionResolveBrand(request);
    if (url.pathname === "/api/extension/audits" && request.method === "POST") return extensionCreateAudit(request);

    const extensionAuditMatch = url.pathname.match(/^\/api\/extension\/audits\/(\d+)$/);
    if (extensionAuditMatch && request.method === "GET") return extensionGetAudit(request, Number(extensionAuditMatch[1]));

    const extensionScoreMatch = url.pathname.match(/^\/api\/extension\/audits\/(\d+)\/scores\/(\d+)$/);
    if (extensionScoreMatch && request.method === "PUT") return extensionSaveScore(request, Number(extensionScoreMatch[1]), Number(extensionScoreMatch[2]));

    const extensionEvidenceMatch = url.pathname.match(/^\/api\/extension\/audits\/(\d+)\/evidence$/);
    if (extensionEvidenceMatch && request.method === "POST") return extensionCreateEvidence(request, Number(extensionEvidenceMatch[1]));
    if (extensionEvidenceMatch && request.method === "GET") return extensionListEvidence(request, Number(extensionEvidenceMatch[1]));

    const extensionSubmitMatch = url.pathname.match(/^\/api\/extension\/audits\/(\d+)\/submit$/);
    if (extensionSubmitMatch && request.method === "POST") return extensionSubmitAudit(request, Number(extensionSubmitMatch[1]));

    const badgeMatch = url.pathname.match(/^\/badge-(\d+)\.svg$/);
    if (badgeMatch) return badgeSvg(Number(badgeMatch[1]));

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ ok: false, errors: ["Not found"] }, { status: 404 });
    }

    return new Response(htmlFile, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },
});

console.log(`Accreditation server listening on http://localhost:${PORT}`);
