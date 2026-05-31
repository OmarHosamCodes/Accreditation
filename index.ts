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
};

type AuditScore = {
  dim_id: number;
  score: number;
  note: string;
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
  users?: Array<{ name: string; role: string; email: string }>;
  nextId: number;
};

const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "roaster";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "roast123";
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
  return TIERS.find((tier) => score >= tier.min) || TIERS[TIERS.length - 1];
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
      if (score) {
        sum += score.score;
        count += 1;
      }
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
    const seed = SEED_ANCHORS[dimension.name];
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
    users: [{ name: "Roaster", role: "admin", email: "roaster@accreditation.io" }],
    nextId: 1,
  };

  seedDemo(db);
  return db;
}

function seedDemo(db: AppState) {
  const demo: Array<[string, Platform, string, string, string, number[]]> = [
    ["Lumen Skincare", "ig", "@lumenskin", "skincare.example.com", "D2C beauty", [9, 9, 8, 8, 9, 8, 8, 9, 8, 7, 8, 9, 8, 9, 8, 8]],
    ["Forge & Co", "ig", "@forgeandco", "forge.example.com", "Menswear", [8, 8, 7, 7, 8, 7, 7, 8, 7, 6, 7, 8, 7, 8, 7, 7]],
    ["Helio Coffee", "ig", "@heliocoffee", "helio.example.com", "Specialty coffee", [7, 8, 7, 7, 7, 6, 7, 7, 8, 7, 7, 6, 6, 6, 7, 7]],
    ["Northwind Realty", "fb", "northwindrealty", "northwind.example.com", "Real estate", [6, 6, 6, 5, 6, 5, 6, 6, 5, 5, 5, 6, 6, 5, 6, 6]],
    ["BiteBox Meals", "ig", "@biteboxmeals", "bitebox.example.com", "Meal prep", [7, 6, 6, 6, 6, 6, 6, 6, 6, 5, 6, 7, 6, 7, 6, 6]],
    ["Apex Fitness", "fb", "apexfitnesshub", "apex.example.com", "Gym", [5, 5, 4, 5, 5, 5, 5, 5, 4, 4, 4, 5, 4, 4, 5, 5]],
    ["Cloudbase SaaS", "ig", "@cloudbasehq", "cloudbase.example.com", "B2B SaaS", [8, 7, 7, 6, 7, 6, 6, 7, 5, 5, 5, 7, 7, 6, 7, 7]],
    ["Petal & Stem", "ig", "@petalstem", "petalstem.example.com", "Florist", [6, 7, 6, 6, 5, 5, 5, 6, 7, 7, 6, 6, 5, 5, 6, 7]],
  ];

  demo.forEach((item, index) => {
    const brandId = db.nextId++;
    db.brands.push({
      id: brandId,
      name: item[0],
      platform: item[1],
      handle: item[2],
      url: `https://${item[3]}`,
      contact_email: `team@${item[3]}`,
      niche: item[4],
      created_at: Date.now() - index * 86400000,
    });

    const auditId = db.nextId++;
    const scores = item[5];
    const overall = computeOverall(scores.map((score, scoreIndex) => ({ dim_id: scoreIndex + 1, score })), db, 1);
    db.audits.push({
      id: auditId,
      brand_id: brandId,
      auditor: "Roaster",
      rubric_version_id: 1,
      weights_version_id: 1,
      status: "published",
      overall_score: overall,
      tier: tierFor(overall).key,
      summary: "Solid presence with clear strengths; see per-dimension notes for the roast.",
      published_at: Date.now() - index * 86400000,
      created_at: Date.now() - index * 86400000,
    });
    db.audit_scores[String(auditId)] = scores.map((score, scoreIndex) => ({ dim_id: scoreIndex + 1, score, note: "" }));
  });

  const brandOne = db.nextId++;
  db.brands.push({
    id: brandOne,
    name: "Verde Wellness",
    platform: "ig",
    handle: "@verdewellness",
    url: "https://verde.example.com",
    contact_email: "hi@verde.example.com",
    niche: "Wellness",
    created_at: Date.now(),
  });
  db.applications.push({
    id: db.nextId++,
    brand_id: brandOne,
    type: "new",
    status: "pending",
    changes_note: "",
    created_at: Date.now() - 3600000,
    why: "We want third-party proof our content is working.",
  });

  const brandTwo = db.nextId++;
  db.brands.push({
    id: brandTwo,
    name: "Stack Studios",
    platform: "fb",
    handle: "stackstudios",
    url: "https://stack.example.com",
    contact_email: "team@stack.example.com",
    niche: "Design agency",
    created_at: Date.now(),
  });
  db.applications.push({
    id: db.nextId++,
    brand_id: brandTwo,
    type: "new",
    status: "pending",
    changes_note: "",
    created_at: Date.now() - 7200000,
    why: "Pitching enterprise clients, need a credibility badge.",
  });
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
      return structuredClone(state);
    },
    async set(nextState) {
      state = structuredClone(nextState);
    },
    async mutate(mutator) {
      const task = queue.then(async () => {
        const working = structuredClone(state);
        const result = mutator(working);
        state = structuredClone(result || working);
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
      return rows[0]?.data || freshDB();
    },
    async set(state) {
      await sql`
        insert into app_state (id, data, updated_at)
        values (1, ${sql.json(state)}, now())
        on conflict (id) do update set data = excluded.data, updated_at = now()
      `;
    },
    async mutate(mutator) {
      const task = queue.then(async () => {
        const rows = await sql<Array<{ data: AppState }>>`select data from app_state where id = 1`;
        const working = rows[0]?.data || freshDB();
        const result = mutator(working);
        const nextState = result || working;
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
      ...(init.headers || {}),
    },
  });
}

async function parseJson(request: Request) {
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

function validateState(state: AppState) {
  const errors: string[] = [];
  if (!Array.isArray(state.categories)) errors.push("categories must be an array");
  if (!Array.isArray(state.dimensions)) errors.push("dimensions must be an array");
  if (!Array.isArray(state.brands)) errors.push("brands must be an array");
  if (!Array.isArray(state.applications)) errors.push("applications must be an array");
  if (!Array.isArray(state.audits)) errors.push("audits must be an array");
  if (!state.audit_scores || typeof state.audit_scores !== "object") errors.push("audit_scores must be an object");
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

    if (url.pathname === "/healthz") return json({ ok: true });
    if (url.pathname === "/api/state" && request.method === "GET") return json(await store.get());
    if (url.pathname === "/api/applications" && request.method === "POST") return createApplication(request);
    if (url.pathname === "/api/reaudits" && request.method === "POST") return createReaudit(request);
    if (url.pathname === "/api/admin/login" && request.method === "POST") return adminLogin(request);
    if (url.pathname === "/api/admin/state" && request.method === "POST") return saveAdminState(request);

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
