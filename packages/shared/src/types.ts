export type Platform = "ig" | "fb";
export type ApplicationStatus = "pending" | "in_progress" | "completed" | "rejected";
export type AuditStatus = "draft" | "published";

export type Category = {
  id: number;
  key: string;
  name: string;
  weight: number;
  sort: number;
};

export type Dimension = {
  id: number;
  category_key: string;
  name: string;
  description: string;
  sort: number;
};

export type Brand = {
  id: number;
  name: string;
  platform: Platform;
  handle: string;
  url: string;
  contact_email: string;
  niche: string;
  created_at: number;
};

export type Application = {
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

export type Audit = {
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

export type AuditScore = {
  dim_id: number;
  score: number;
  note: string;
  confidence?: "low" | "medium" | "high";
  evidence_count?: number;
  updated_at?: number;
};

export type EvidencePin = {
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

export type AppState = {
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

export type Tier = {
  key: string;
  name: string;
  min: number;
  col: string;
  cls: string;
  dcls: string;
};
