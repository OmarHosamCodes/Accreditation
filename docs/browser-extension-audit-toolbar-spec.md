# Browser Extension Audit Toolbar Spec

## Product Summary

Build a browser extension that adds an accreditation audit toolbar to any Instagram or Facebook brand page. The toolbar lets an auditor review the live page, place comment-style evidence pins on page elements, score the brand against the existing 16 accreditation metrics, and publish the completed audit to the Accreditation web app leaderboard.

The final product is a page accreditation audit tool with three connected surfaces:

- Browser extension toolbar for live page inspection, pinned evidence, metric scoring, and audit submission.
- Accreditation backend for brands, audits, scores, evidence, comments, and leaderboard data.
- Public accreditation site with audit detail pages, tier badges, and a ranked leaderboard.

## Goals

- Let auditors evaluate a brand where the evidence actually lives: on the live social page.
- Merge visual, page-level comments with the current accreditation rubric.
- Convert individual metric scores into a weighted overall score and tier.
- Publish completed audits into the existing leaderboard.
- Preserve enough evidence for review, dispute handling, and future re-audits.

## Non-Goals

- Do not automate final scoring with AI in the first release.
- Do not scrape private content, DMs, or authenticated-only data beyond what the auditor can manually see.
- Do not replace the existing public accreditation app.
- Do not support every website in MVP; focus on Instagram and Facebook brand pages.
- Do not create public comments on the audited social platform.

## Primary Users

### Auditor

Uses the extension to inspect pages, leave evidence notes, score metrics, and publish audits.

### Admin

Manages auditors, rubric versions, weight versions, audit status, and disputes.

### Brand

Applies for accreditation, receives results, and can request re-audit.

### Public Visitor

Views the leaderboard, audit summary, tier, and selected public evidence.

## Core Concept

The extension behaves like a review toolbar layered over the current page. The auditor can:

1. Open a target Instagram or Facebook page.
2. Start or resume an audit.
3. Select one of the 16 metrics.
4. Click a page element to add an evidence pin.
5. Write an observation, severity, and optional recommendation.
6. Score the selected metric from 1 to 10.
7. Repeat until all metrics are scored.
8. Submit the audit for review or publish directly, depending on permissions.

## Metrics

The product uses the existing rubric dimensions and category weights.

### Brand Foundation, 20%

- Positioning
- Identity Coherence
- Strategic Real Estate

### Exposure, 20%

- Hook-to-Value Ratio
- PaC Consistency
- Overall Brand Exposure
- Frequency

### Influence, 30%

- Value Density
- Parasocial Depth
- Comment-to-Reaction Rate
- Engagement Rate

### Conversion, 30%

- Clear Selling Proposition
- Clear Objection Handling
- Clear Offer
- Response Time
- Response Quality

## Scoring

Each metric receives:

- Score: integer from 1 to 10.
- Note: required short explanation.
- Evidence: at least zero pins in draft, but at least one evidence item should be required before publish for high-risk or low-confidence scores.
- Confidence: low, medium, or high.

The overall score uses the existing weighted category model:

1. Average all metric scores within each category.
2. Convert each category average from 10-point scale to 100-point scale.
3. Multiply by the active category weight.
4. Sum category results.
5. Round to nearest whole number.

### Tiers

- Platinum: 90-100
- Gold: 80-89
- Silver: 70-79
- Bronze: 60-69
- Needs Roasting: 0-59

## Extension UX

### Toolbar

The toolbar appears as a compact fixed panel on supported pages.

Required controls:

- Accreditation logo/status button.
- Brand selector or detected brand identity.
- Audit status: not started, draft, ready, submitted, published.
- Metric selector grouped by category.
- Score control from 1 to 10.
- Comment/pin mode toggle.
- Evidence list button.
- Submit/publish button.
- Collapse button.

### Comment-Style Evidence Pins

Evidence pins work like Vercel-style visual comments.

When pin mode is active:

1. Auditor clicks a visible page element or screen coordinate.
2. Extension creates a numbered pin.
3. A thread popover opens.
4. Auditor writes an evidence note.
5. Evidence is linked to the active metric.

Each evidence item stores:

- Metric dimension id.
- Page URL.
- Platform.
- CSS selector when available.
- DOM path fallback.
- Viewport-relative coordinates.
- Element text excerpt when available.
- Screenshot crop or full screenshot reference.
- Auditor note.
- Visibility: private, brand-visible, public.
- Created timestamp.

Pins should remain stable when possible. If the original element cannot be found on reload, fall back to viewport coordinates and mark the evidence as detached.

### Metric Panel

The metric panel shows:

- Category name and weight.
- Metric description.
- Score anchors for 1, 5, and 10.
- Current score.
- Required note field.
- Linked evidence count.
- Confidence selector.

### Audit Progress

The extension shows completion by category:

- Not scored.
- Scored without note.
- Scored with note.
- Scored with evidence.
- Ready.

Publish readiness requires all 16 metrics to have a score and note.

## Supported Pages

MVP supports:

- Instagram profile pages.
- Facebook page/profile pages used by brands.

Detection should extract:

- Platform.
- Handle/page id.
- Display name when available.
- Current URL.

The auditor can override detected brand details before starting the audit.

## Browser Extension Architecture

Use Manifest V3.

### Extension Components

- Content script: injects toolbar UI, pin overlay, DOM targeting, and screenshot capture coordination.
- Background service worker: handles auth state, API requests, tab events, and permission-aware actions.
- Popup or side panel: optional dashboard for active audits and settings.
- Options page: API base URL, environment, account status, and debugging.

### Permissions

Minimum expected permissions:

- `activeTab`
- `storage`
- `scripting`
- Host permissions for supported domains:
  - `https://www.instagram.com/*`
  - `https://www.facebook.com/*`

Use broader host permissions only after a product decision to support arbitrary websites.

## Backend Architecture

The existing Bun server should become the system of record for:

- Brands.
- Applications.
- Audits.
- Audit scores.
- Evidence pins.
- Comment threads.
- Users and roles.
- Rubric versions.
- Weight versions.

The current in-memory/Postgres state model can be extended first, then normalized later if needed.

## Data Model

### Brand

Existing fields remain:

- id
- name
- platform
- handle
- url
- contact_email
- niche
- created_at

Add if needed:

- external_platform_id
- detected_name
- last_seen_url

### Audit

Existing fields remain:

- id
- brand_id
- auditor
- rubric_version_id
- weights_version_id
- status
- overall_score
- tier
- summary
- created_at
- published_at

Add:

- source: extension, admin, import
- page_snapshot_url
- submitted_at
- reviewed_by
- reviewed_at

### Audit Score

Existing fields remain:

- dim_id
- score
- note

Add:

- confidence
- evidence_count
- updated_at

### Evidence Pin

New entity:

- id
- audit_id
- dim_id
- author
- platform
- page_url
- selector
- dom_path
- x
- y
- viewport_width
- viewport_height
- element_text
- screenshot_url
- note
- visibility
- status
- created_at
- updated_at

### Evidence Thread

New entity:

- id
- evidence_id
- status: open, resolved
- created_at
- resolved_at

### Evidence Comment

New entity:

- id
- thread_id
- author
- body
- created_at
- updated_at

## API Spec

### Auth

`POST /api/auth/login`

Request:

```json
{
  "username": "roaster",
  "password": "change-me"
}
```

Response:

```json
{
  "token": "session-token",
  "user": {
    "name": "Roaster",
    "role": "admin"
  }
}
```

### Detect or Create Brand

`POST /api/extension/brands/resolve`

Request:

```json
{
  "platform": "ig",
  "handle": "brand",
  "url": "https://www.instagram.com/brand/",
  "detected_name": "Brand"
}
```

Response:

```json
{
  "brand_id": 12,
  "created": false
}
```

### Start Audit

`POST /api/extension/audits`

Request:

```json
{
  "brand_id": 12,
  "rubric_version_id": 1,
  "weights_version_id": 1
}
```

Response:

```json
{
  "audit_id": 44,
  "status": "draft"
}
```

### Save Score

`PUT /api/extension/audits/:audit_id/scores/:dim_id`

Request:

```json
{
  "score": 8,
  "note": "Clear offer appears in bio and pinned content.",
  "confidence": "high"
}
```

### Create Evidence Pin

`POST /api/extension/audits/:audit_id/evidence`

Request:

```json
{
  "dim_id": 14,
  "platform": "ig",
  "page_url": "https://www.instagram.com/brand/",
  "selector": "header section a",
  "dom_path": "html.body.div[2].main.header.section.a[1]",
  "x": 712,
  "y": 318,
  "viewport_width": 1440,
  "viewport_height": 900,
  "element_text": "Book a consultation",
  "note": "Primary next step is visible above the fold.",
  "visibility": "brand-visible"
}
```

### List Audit Evidence

`GET /api/extension/audits/:audit_id/evidence`

### Submit Audit

`POST /api/extension/audits/:audit_id/submit`

Response:

```json
{
  "audit_id": 44,
  "status": "published",
  "overall_score": 84,
  "tier": "Gold"
}
```

## Leaderboard

The leaderboard ranks published audits only.

Required filters:

- Platform: all, Instagram, Facebook.
- Tier.
- Niche.
- Search by brand or handle.

Required columns:

- Rank.
- Brand.
- Platform.
- Score.
- Tier.
- Audit date.
- Niche.

Clicking a row opens the public audit detail page.

## Public Audit Detail

The public detail page should show:

- Brand name, platform, handle, and URL.
- Overall score and tier.
- Category scores.
- Metric scores and notes.
- Public or brand-visible evidence, depending on viewer permission.
- Summary.
- Audit date and rubric version.

Private evidence remains admin-only.

## Roles and Permissions

### Admin

- Manage rubric and weights.
- Create, edit, submit, publish, reject, or delete audits.
- Manage auditors.
- View all evidence.

### Auditor

- Create audits.
- Add scores and evidence.
- Submit audits.
- Publish only if granted direct-publish permission.

### Brand Viewer

- View own audit details and brand-visible evidence.
- Request re-audit.

### Public Viewer

- View published leaderboard and public audit details.

## Security and Privacy

- Do not collect credentials for Instagram or Facebook.
- Do not access or store DMs.
- Do not store private page content unless explicitly captured by an auditor with permission.
- Keep screenshot evidence private by default.
- Redact emails, phone numbers, and personal data in screenshot evidence where possible.
- Require authenticated API access for all extension write operations.
- Store extension auth tokens in browser extension storage, not page local storage.
- Use strict content script isolation and avoid injecting secrets into the page context.

## Technical Implementation Plan

### Phase 1: Backend Foundation

- Add evidence entities to app state.
- Add extension API routes.
- Add auth token/session handling for extension calls.
- Add audit readiness validation.
- Add leaderboard filtering endpoint.

### Phase 2: Extension MVP

- Create Manifest V3 extension.
- Inject toolbar on Instagram and Facebook pages.
- Detect platform and handle.
- Authenticate with Accreditation backend.
- Start and resume draft audits.
- Score all 16 metrics.
- Add evidence pins with notes.
- Persist scores and evidence through API.

### Phase 3: Publish Flow

- Submit audit from extension.
- Compute overall score and tier.
- Publish to leaderboard.
- Show audit details on public site.
- Add admin review controls for submitted audits.

### Phase 4: Evidence Quality

- Add screenshot capture.
- Add evidence thread replies.
- Add resolved/open states.
- Add detached evidence handling.
- Add exportable audit report.

## MVP Acceptance Criteria

- Extension appears only on supported Instagram and Facebook URLs.
- Auditor can log in from the extension.
- Auditor can create or resume an audit for the current brand page.
- Auditor can score every existing accreditation metric.
- Auditor can place visual evidence pins linked to a metric.
- Scores and evidence persist after page refresh.
- Audit cannot publish until all metrics have a score and note.
- Publishing computes the same weighted score as the current app.
- Published audit appears in the leaderboard.
- Public audit page shows score, tier, category breakdown, and metric notes.

## Open Decisions

- Whether auditor-submitted audits publish immediately or require admin review.
- Whether screenshot evidence is required for every metric or only optional.
- Whether brands can see evidence before the audit is published.
- Whether the extension should support arbitrary websites after IG/FB MVP.
- Whether evidence comments should support external reviewers.
- Whether to normalize Postgres tables immediately or continue with JSON state until product fit is proven.

## Recommended First Build

Start with a narrow MVP:

1. Extend the current Bun app with evidence storage and extension routes.
2. Build a Chrome Manifest V3 extension with a fixed injected toolbar.
3. Support manual brand resolution and audit creation.
4. Implement scoring and evidence pins without screenshot upload first.
5. Publish completed audits into the existing leaderboard.

This path validates the core workflow before investing in screenshot storage, advanced DOM anchoring, threaded collaboration, or broader browser support.
