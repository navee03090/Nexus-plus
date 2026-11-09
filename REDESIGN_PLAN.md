# NexusPulse — UI/UX Redesign Plan (Phase 1)

**Product:** NexusPulse – Opportunity Intelligence  
**Scope:** Pakistan-wide opportunity discovery platform  
**Document status:** Implementation in progress (Direction B — Refined Editorial Dark)  
**Date:** 9 November 2026  
**Implementation note:** Direction B complete for public + admin UI, including Explore pagination, admin/account retokens, FastAPI `sort_by=trust`, route `loading.tsx` skeletons, and `next/image` flyer rendering via `FlyerImage`.  

---

## 1. Executive Summary

NexusPulse is a real product with strong backend intelligence (ingestion, verification, provenance, deduplication) but a frontend that currently reads as a **generic dark SaaS template** with **regional KP/Peshawar positioning**, uneven information hierarchy, and inconsistent UI primitives.

This redesign reframes the product as a **premium, nationwide opportunity discovery platform for Pakistan** — covering students, researchers, founders, and professionals across Islamabad, Lahore, Karachi, Peshawar, Quetta, Multan, Faisalabad, Hyderabad, and remote/online programs — while preserving all existing functionality, APIs, auth, and database schema.

**Recommended visual direction:** **Refined Editorial Dark** (Direction B) — retain a trustworthy dark canvas, replace indigo-glow “AI template” aesthetics with calm surfaces, sharp typography, and verification-first hierarchy.

**Phase 1 outcome:** This document is the blueprint. No source code, dependencies, components, or backend changes are made until explicit approval.

---

## 2. Existing Architecture Analysis

### 2.1 Repository layout (discovered)

```
Nexus Plus/
├── web/                 # Next.js 14 App Router frontend
├── backend/             # FastAPI + SQLAlchemy + Celery
├── supabase/            # Migrations / Postgres
├── extension/           # Browser extension (out of redesign scope for Phase 1 UI)
├── docs/
└── docker-compose.yml
```

### 2.2 Frontend stack (from source — not assumed)

| Layer | Actual technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3.4 + `globals.css` utilities |
| Icons | `lucide-react` |
| Class utils | `clsx` + `tailwind-merge` (`cn`) |
| Font | Google Fonts **Inter** (`layout.tsx`) |
| Data | Supabase REST (primary public reads) → FastAPI fallback → static `fallback_data.ts` |
| Auth | Supabase Auth (`login` / `register`); account nav currently hidden |
| UI kit | **No** shadcn/Radix/MUI — all bespoke Tailwind |

### 2.3 Design tokens today

**Tailwind (`web/tailwind.config.ts`):**
- `brand.*` → indigo scale (`#6366f1` family)
- `pulse.cyan / emerald / amber / rose`

**CSS variables (`globals.css`):** shadcn-like HSL tokens exist but are **barely used**; UI mostly hardcodes `slate-*` + `indigo-*`.

**Custom utilities:**
- `.glass-panel` / `.glass-panel-hover` (used by OpportunityCard)
- `.pulse-indicator` (**defined but unused**)
- Custom dark scrollbars

**Body:** `bg-slate-950 text-slate-100`, `html.dark`, Inter, indigo text selection.

### 2.4 Routing & page architecture

| Route | Exists | Public nav? | Notes |
|---|---|---|---|
| `/` | Yes | Logo | Homepage: hero, search, stats, categories, featured, pipeline explainer, regional CTA |
| `/opportunities` | Yes | Explore | Search, category/city/online/urgency filters, sort, card grid |
| `/opportunities/[slug]` | Yes | — | Detail + sticky CTA sidebar, provenance, changes |
| `/admin` | Yes | Admin Review | Pipeline health dashboard |
| `/admin/review` | Yes | Sidebar | Verification queue (core editorial UX) |
| `/admin/opportunities` | Yes | Sidebar | Published catalog manager |
| `/admin/sources` | Yes | Sidebar | Source registry + crawl |
| `/admin/ingestion` | Yes | Sidebar | Ingestion run logs |
| `/admin/ingest` | Yes | Sidebar | Curator drop station |
| `/admin/settings` | Yes | Sidebar | Audit logs (labeled settings) |
| `/login`, `/register` | Yes | No | Auth forms + demo login |
| `/for-you`, `/saved`, `/alerts`, `/profile` | Yes | **Hidden** | Personalization surfaces exist; Navbar comment: hide until login ships |

**Layouts:**
- Root: `Navbar` + `main` + `Footer` + `TopProgress` + `BackendWarmup`
- Admin: `AdminSidebar` + content pane (Footer still from root)

### 2.5 Reusable components (current)

```
web/src/components/
├── Navbar.tsx
├── Footer.tsx
├── OpportunityCard.tsx
├── VerificationBadge.tsx
├── UrgencyBadge.tsx
├── CalendarButton.tsx
├── ShareModal.tsx
├── ReportModal.tsx
├── AdminSidebar.tsx
├── TopProgress.tsx
├── BackendWarmup.tsx
└── admin/OpportunityEditor.tsx
```

Detail-page local: `OpportunityActionButtons.tsx`

### 2.6 Data & integrations

- **Public opportunities:** Supabase → Render FastAPI `/api/v1/events` → fallback seed data
- **Categories / stats:** same cascade
- **Admin write paths:** FastAPI only (review approve/reject, sources, curator, catalog)
- **Pagination:** API returns `meta.page / page_size / total_*`; **Explore UI ignores pagination** (fetches up to 50, client-filters `q`, client-sorts)
- **Search:** Explore uses client-side string match on fetched list; dedicated `searchOpportunities` API helper exists but Explore page does not use it
- **City filters UI:** hardcoded `Peshawar`, `Islamabad`, `Lahore` only (no Karachi/Quetta/etc.)
- **Bookmark / save:** optimistic client state; auth-gated persistence incomplete for public UX

### 2.7 Positioning mismatch (critical for redesign)

Product mission (README + metadata): **Pakistan**.  
Current UI copy and chrome: **Peshawar / KPK first**, “expanding nationwide.”

Affects Navbar coverage pill, Footer geography, Homepage regional banner, Explore subtitle, SEO keywords, and city filter set. Redesign must treat **Pakistan as the primary market**, with cities as filters — not KP as the brand identity.

---

## 3. Current UI/UX Audit

### A. Visual design

| Area | Finding |
|---|---|
| Brand | “NP” gradient tile + ping dot + Inter + indigo = interchangeable AI SaaS |
| Color | Over-reliance on indigo-600 CTAs + slate-950; status colors (emerald/amber/rose/cyan) compete without a system |
| Typography | Single Inter stack; heavy `font-extrabold`; body often `text-xs` — feels dense and under-designed |
| Spacing | Mix of generous hero padding and cramped card metadata; inconsistent section rhythm |
| Hierarchy | Hero sells the **pipeline** harder than the **outcome** (find a verified opportunity) |
| Cards | Glass + tall image strip + emoji placeholder + badge overload |
| Buttons | Many near-identical indigo pills; primary vs secondary unclear |
| Effects | Blur orbs, glass hover lift, ping animations → visual noise, not trust |

### B. User experience

| Journey step | Issue |
|---|---|
| First impression | Technical jargon (“cryptographically verified”, “multimodal”, “zero hallucination”) before value |
| Navigation | Only Explore + Admin; personal tools hidden; Admin exposed to all visitors |
| Search | Works, but Discover/Search CTAs are redundant with Browse |
| Discoverability | Categories are horizontal pills with no counts or descriptions |
| Filtering | City set incomplete for Pakistan; filter state partially preserved across links |
| Cards | Deadline/verification compete; Apply not on card; empty flyer area wastes space |
| Detail | Strong provenance story; Apply CTA is good; related opportunities **missing** |
| Empty/loading | Basic; no skeletons on Explore |
| Account features | Built pages not in IA → dead-end product story |

### C. Responsive design

| Breakpoint | Risk |
|---|---|
| Large desktop | Content maxes at `max-w-7xl`; fine, but cards stretch empty flyer zones |
| Laptop | OK overall |
| Tablet | Admin sidebar remains `w-64` beside content — squeezes review workspace |
| Mobile | Category/filter pill rows overflow horizontally; sort + results header can wrap awkwardly; sticky detail sidebar becomes long scroll; Admin sidebar not drawerized |

### D. Technical design issues

1. **No design system components** — every page reimplements `rounded-2xl bg-slate-900 border border-slate-800…`
2. **Unused tokens** — CSS variables and `.pulse-indicator` unused; Tailwind `brand` barely referenced vs raw indigo
3. **Duplication** — date formatting in utils vs admin pages; similar empty states repeated
4. **Card as client component** — entire card client-side for bookmark only
5. **Explore ignores API pagination meta** — will break as catalog grows
6. **Performance** — glass blur + hover transforms + unoptimized `<img>` flyers; Inter only (acceptable) but many Lucide icons per card
7. **A11y** — icon-only controls partially labeled; focus rings inconsistent (`focus:outline-none` common); contrast of `slate-400` on `slate-950` borderline; emoji in empty states

---

## 4. Problems and Improvement Opportunities

For each issue: **Problem → Impact → Solution → Priority** (P0 critical / P1 high / P2 medium / P3 polish).

### 4.1 Brand reads as generic AI template
1. **Problem:** Indigo gradients, glassmorphism, ping dots, Inter, “NP” tile.  
2. **Impact:** Low trust; hard to distinguish from countless dark SaaS demos.  
3. **Solution:** Distinct wordmark, restrained accent, editorial type pairing, remove decorative pulses.  
4. **Priority:** P0

### 4.2 Regional positioning undercuts national product
1. **Problem:** UI says KPK/Peshawar focus while product is for all Pakistan.  
2. **Impact:** Users in Lahore/Karachi/Islamabad feel excluded; brand feels provincial.  
3. **Solution:** Reframe copy to “Pakistan”; cities as equal filters; keep KP sources as coverage depth, not headline identity.  
4. **Priority:** P0

### 4.3 Hero sells infrastructure, not opportunity
1. **Problem:** Pipeline language dominates first viewport.  
2. **Impact:** Students bounce before searching.  
3. **Solution:** Hero = brand + one outcome headline + search. Move “How it works” below fold, simplified.  
4. **Priority:** P0

### 4.4 Opportunity cards are noisy and placeholder-heavy
1. **Problem:** Fixed image height, ⚡ placeholder, overlapping badges, weak deadline primacy.  
2. **Impact:** Hard to scan; looks unfinished when no flyer.  
3. **Solution:** Content-first card; category accent; deadline as primary meta; no empty image frames.  
4. **Priority:** P0

### 4.5 Admin exposed as primary public CTA
1. **Problem:** Homepage and Navbar push Admin Review to everyone.  
2. **Impact:** Confuses visitors; looks unfinished/internal.  
3. **Solution:** Public nav = Explore (+ Search). Admin only for authenticated staff or discreet footer.  
4. **Priority:** P1

### 4.6 Explore filters incomplete for Pakistan
1. **Problem:** Three cities; no province grouping; no Karachi etc.  
2. **Impact:** National users cannot narrow effectively.  
3. **Solution:** Major city chips + “All Pakistan” + Online; optional province later (UI only until API supports).  
4. **Priority:** P1

### 4.7 No pagination / load-more UX
1. **Problem:** Cap at ~50 client-side.  
2. **Impact:** Silent incompleteness as data grows.  
3. **Solution:** Use API `meta`; page or infinite load UI.  
4. **Priority:** P1 (UI wiring; API already supports)

### 4.8 Detail page missing related opportunities
1. **Problem:** Dead end after reading.  
2. **Impact:** Lower exploration depth.  
3. **Solution:** Related by category/city/org section.  
4. **Priority:** P2

### 4.9 Typography scale is too small and uniform
1. **Problem:** Excessive `text-xs` UI.  
2. **Impact:** Feels like a dense admin tool, not a public product.  
3. **Solution:** Raise body to 14–16px; tighten display scale; separate UI vs content type.  
4. **Priority:** P1

### 4.10 Inconsistent surfaces and radii
1. **Problem:** `rounded-xl` / `2xl` / `3xl` mixed freely.  
2. **Impact:** Unpolished.  
3. **Solution:** Radius scale in tokens; components only.  
4. **Priority:** P1

### 4.11 Personalization pages orphaned
1. **Problem:** For You / Saved / Alerts / Profile exist but hidden.  
4. **Solution:** Keep pages; redesign later; expose only when auth ready — document, don’t delete.  
4. **Priority:** P2 (IA), P3 (visual until auth)

### 4.12 Trust signals over-explained with jargon
1. **Problem:** “Cryptographic”, “zero hallucination” in consumer UI.  
2. **Impact:** Intimidating; unclear benefit.  
3. **Solution:** User language: “Verified from official sources” + link to evidence. Keep technical depth on Admin/About.  
4. **Priority:** P1

---

## 5. Three Proposed Visual Directions

### Direction A — “National Light Editorial”
- Light canvas, deep green/ink accents (evoking Pakistani institutional trust without flag pastiche)
- Serif display + clean sans UI
- Magazine-like opportunity directory  

**Strengths:** Distinct, readable outdoors, academic credibility.  
**Weaknesses:** Large rewrite from current dark; admin tooling often prefers dark; photos/flyers vary.  
**Fit:** High brand uniqueness; medium continuity.

### Direction B — “Refined Editorial Dark” ★ Recommended
- Keep dark foundation for continuity and focus
- Replace indigo glow with **deep ink + single emerald verification accent + warm neutral text**
- Sharp sans (e.g. Geist / Satoshi / Plus Jakarta) + optional display for brand only
- Surfaces: flat elevated panels, 1px borders, minimal blur  

**Strengths:** Premium SaaS quality (Linear/Vercel caliber) without cloning; preserves dark familiarity; verification accent maps to existing emerald badges; works for public + admin.  
**Weaknesses:** Must avoid sliding back into purple-glow clichés; contrast must be audited.  
**Fit:** Best balance of polish, trust, and implementability on current stack.

### Direction C — “Bright Institutional Portal”
- White/gray government-portal clarity, blue primary, dense tables + cards hybrid  

**Strengths:** Familiar to HEC/gov audiences.  
**Weaknesses:** Can feel bureaucratic; weak “modern intelligence” signal; fights current component shapes.  
**Fit:** Safer for older demographics; weaker for tech students/founders.

### Dark interface decision

**Retain dark, refine it (Direction B).** Do not flip to light in v1 redesign unless user testing demands it. Offer a future theme token hook, but ship one coherent dark system first.

---

## 6. Recommended Visual Direction

**Ship Direction B — Refined Editorial Dark**, positioned as:

> **NexusPulse — Verified opportunities across Pakistan.**

**Why:**
1. Aligns with trust + intelligence without template glow.
2. Minimal disruption to admin dark workflows.
3. Emerald “verified” accent already exists in badges — elevate it to brand meaning.
4. Supports dense directories and calm reading of long descriptions.
5. Differentiates via typography, spacing, and content hierarchy — not more effects.

**Brand personality:** Calm, precise, nationwide, evidence-backed — not flashy AI.

**References for quality (not to copy):** Linear (density/clarity), Vercel (dark restraint), Stripe (trust hierarchy), Notion (content calm), well-made directories (scanability).

---

## 7. Page-by-Page Redesign Specification

Legend: **[Exists]** vs **[Proposed improvement]**

### 7.1 Global — Navigation / Header `[Exists]`

**Current:** Sticky dark bar; NP logo; coverage “KPK/Peshawar”; links Explore + Admin Review; mobile menu.

**Redesign:**
- Wordmark: `NexusPulse` (single mark; subtle accent on Pulse only)
- Coverage chip: `Pakistan` (optional live source count) — not KPK-first
- Primary nav: **Explore**; secondary icon button **Search** focusing hero/explore
- **Remove Admin from primary public nav** `[Proposed]` — move under authenticated staff or Footer “Operators”
- Mobile: full-screen or sheet menu; large tap targets
- Future (auth ready): Saved / For You as secondary — pages already exist

### 7.2 Global — Footer `[Exists]`

**Redesign:** Brand blurb (Pakistan-wide); Directory links; Trust (“Verified sources”); Legal/disclaimer; city quick links (Islamabad, Lahore, Karachi, Peshawar, Online). Soften operator links. Drop `PK-KP` mono badge as identity.

### 7.3 Homepage `[Exists]`

| Section | Status | Redesign intent |
|---|---|---|
| Hero | Exists | One composition: brand, headline (“Find verified opportunities across Pakistan”), one sentence, search + popular queries, one primary CTA (Explore). No Admin CTA. No pipeline jargon in hero. |
| Popular searches | Exists | Keep; refresh examples nationwide (HEC Scholarships, NIC programs, Hackathons, Internships Karachi, etc.) |
| Stats strip | Exists | Keep 3–4 metrics; plain language labels (“Sources monitored”, “Published opportunities”, “Duplicates merged”, “Source-backed”) |
| Categories | Exists | Richer chips with optional counts; avoid fire emoji header |
| Latest verified | Exists | Use redesigned cards; optional “Featured” row if `featured` flag true |
| Pipeline / How it works | Exists | Simplify to 3 short steps in user language; demote technical mono footers |
| Regional banner | Exists | **Replace** KP-only banner with **Pakistan coverage** map/list of major hubs + “Online” — KP remains one region among many |
| Trust strip | Proposed | Compact “Every listing links to an original source” |

### 7.4 Explore Opportunities `[Exists]`

| Element | Status | Redesign |
|---|---|---|
| Heading | Exists | “Explore opportunities” + Pakistan subtitle |
| Search | Exists | Persist filters; clearer submit; consider using server search API |
| Category filters | Exists | Scrollable chip group + selected state from tokens |
| City / location | Exists (limited) | Expand chips: All · Islamabad · Lahore · Karachi · Peshawar · Quetta · Multan · Faisalabad · Online · More… |
| Sort | Exists | Segmented control (Deadline / Newest / Trust) |
| Listing | Exists | Responsive grid; optional compact list toggle `[Proposed]` |
| Pagination | API yes / UI no | Add page controls or Load more using `meta` |
| Empty / loading | Partial | Skeleton cards; helpful empty with clear filters CTA |

### 7.5 Opportunity Details `[Exists]`

| Element | Status | Redesign |
|---|---|---|
| Title / org | Exists | Stronger title hierarchy; org avatar from logo or initials monogram (not emoji) |
| Description / eligibility | Exists | Comfortable reading measure; clearer section titles |
| Deadlines / location / category | Exists | Fact list with deadline emphasis |
| Verification / sources | Exists | Keep provenance — rewrite microcopy to plain English |
| Apply CTA | Exists | Sticky on mobile bottom bar `[Proposed]` |
| Actions | Exists | Save / Share / Report / Calendar — unify button styles |
| Related | **Missing** | Same category / same city recommendations `[Proposed]` |
| Flyer | Exists | Show only if present; never reserve empty hero |

### 7.6 Admin Review & Console `[Exists]`

Keep workflows intact (queue, edit, approve/reject, sources, curator, catalog).

**Visual redesign goals:**
- Align tokens with public site (same surfaces/buttons)
- Sidebar → desktop sticky + **mobile drawer**
- Review: improve density, sticky action bar, clearer “Ready to publish” state (logic stays)
- Reduce marketing language inside admin (“System Invariants” → short operational help)

Pages in scope: `/admin`, `/review`, `/opportunities`, `/sources`, `/ingestion`, `/ingest`, `/settings`.

### 7.7 Auth & account pages `[Exists, nav-hidden]`

Login/Register/For You/Saved/Alerts/Profile: restyle to design system when touched; **do not remove**. Expose in nav only when auth productized.

### 7.8 Extension `[Exists]`

Out of primary web redesign; optional later token alignment.

---

## 8. Proposed Design System

### 8.1 Principles
1. One accent meaning: **verification / progress = emerald**
2. Neutrals do the work; color is scarce
3. Content > chrome
4. Pakistan-first language
5. Components, not page-level one-offs

### 8.2 Color (proposed tokens)

| Token | Role | Suggested value |
|---|---|---|
| `--bg` | App background | `#070A0F` |
| `--surface` | Cards / panels | `#0E141B` |
| `--surface-2` | Nested / inputs | `#151C25` |
| `--border` | Default border | `#243041` |
| `--border-strong` | Focused / active | `#3A4B61` |
| `--text` | Primary text | `#E8EEF6` |
| `--text-muted` | Secondary | `#93A1B5` |
| `--text-faint` | Tertiary | `#6B7A90` |
| `--accent` | Brand accent (links, focus) | `#3D8BFF` cool blue — **not indigo-violet** |
| `--accent-soft` | Chip backgrounds | blue @ 12% |
| `--verify` | Verified / success | `#1F9B6A` |
| `--warn` | Closing soon | `#D69A2D` |
| `--danger` | Urgent / reject | `#D4535A` |
| `--online` | Virtual | `#2AA8C9` |

Map into Tailwind `theme.extend.colors` as `np.bg`, `np.surface`, etc. Deprecate decorative indigo-600 as default CTA over time.

### 8.3 Typography

| Role | Recommendation | Notes |
|---|---|---|
| UI / body | **Plus Jakarta Sans** or **Geist Sans** | Replace Inter |
| Brand lockup (optional) | Same family, tighter tracking | Avoid novelty script |
| Mono (admin/meta only) | Geist Mono / JetBrains Mono | Sparse use |

**Scale:** `12 / 14 / 16 / 18 / 24 / 32 / 40` with clear line-heights. Default body **14–16px**, not 12px everywhere.

### 8.4 Spacing
Base 4px. Public sections: `24 / 32 / 48 / 64 / 96`. Card padding: `16–20`. Form gaps: `12–16`.

### 8.5 Radius
| Token | Value | Use |
|---|---|---|
| `sm` | 6px | Chips, inputs compact |
| `md` | 10px | Buttons |
| `lg` | 14px | Cards |
| `xl` | 20px | Large panels / hero search |
Avoid `rounded-3xl` as default.

### 8.6 Elevation / shadow
Prefer border + subtle `shadow-sm` (`0 1px 0 rgba(255,255,255,0.04)` inset optional). Reserve larger shadows for sticky CTA panels only. **No glass blur on cards.**

### 8.7 Components (system)

**Buttons:** `primary` (accent fill), `secondary` (surface + border), `ghost`, `danger`, `verify` (approve). States: hover / focus-visible ring / active / disabled opacity.

**Inputs:** surface-2, border, focus ring accent; error warn/danger border. Min height 40px mobile.

**Badges:** `category`, `verified`, `pending`, `urgent`, `closing`, `online`, `closed` — single height, icon optional.

**Cards:** `OpportunityCard`, `StatCard`, `Panel`, `EmptyState`.

**Nav:** `SiteHeader`, `MobileNav`, `AdminNav` (drawer on small screens).

### 8.8 Breakpoints
Keep Tailwind defaults: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`.  
Content width: `max-w-6xl` or `max-w-7xl` consistently.

### 8.9 Motion
2–3 intentional motions only: top progress, card hover border (no lift spam), subtle page fade. Remove logo ping and ambient pulse rings on marketing chrome.

---

## 9. Opportunity Card Redesign Specification

### Goals
Scan in &lt;2 seconds: **what** · **who** · **where** · **when closes** · **trusted?** · **next action**

### Layout (content-first)

```
┌─────────────────────────────────────────┐
│ [Category]              [Verified] [⏱]  │
│                                         │
│ Opportunity title (2-line clamp)        │
│ Organizer name                          │
│                                         │
│ Short summary (2 lines)                 │
│                                         │
│ 📍 City or Online    📅 Deadline date   │
│─────────────────────────────────────────│
│ [Save]                      [View →]    │
└─────────────────────────────────────────┘
```

### Rules
1. **No empty image frame.** If `flyer_url` exists, optional compact 120–140px media **or** left accent thumbnail — never forced 176px void.
2. **No decorative emoji placeholders.** Without flyer: category-colored left border or monogram from organization name.
3. **Deadline** uses `registration_deadline` as primary date for applicants (event dates secondary).
4. **VerificationBadge** stays; shorten labels (“Verified”, “In review”).
5. **Apply** optional on card only if `registration_url` present — secondary to View to avoid misclicks; detail page keeps primary Apply.
6. **Bookmark** remains; don’t block whole-card navigation.
7. Match score only on For You (`showMatchScore`).
8. Whole card clickable to detail with nested button stopPropagation preserved.

### Visual treatments without images
- 3px left border keyed to category color token map
- 32px org monogram (initials)
- Optional soft category pattern (CSS only, low contrast) — never stock Unsplash decoys in production UI

---

## 10. User Experience Improvements

### Ideal journey
1. **Open NexusPulse** → instantly understand: verified opportunities across Pakistan.  
2. **Search** from hero (e.g. “scholarship Lahore”).  
3. **Land on Explore** with query applied; refine category / city / online / closing soon.  
4. **Scan cards** — deadline + verified status obvious.  
5. **Open detail** — eligibility, dates, organizer.  
6. **Check sources** — open primary official link.  
7. **Apply** on original registration URL (NexusPulse does not replace the source).  
8. Optional: Save / Calendar / Share.

### Friction reductions
| Friction | Fix |
|---|---|
| Jargon wall | Plain-language hero and badges |
| Admin distraction | Remove from public primary path |
| Weak national filters | Full major-city set |
| Dead ends | Related opportunities |
| Unclear trust | “Verified from official source” + one-click evidence |
| Mobile apply | Sticky apply bar on detail |
| Catalog growth | Pagination / load more |
| Hidden account value | Document IA; enable with auth |

---

## 11. Responsive Design Strategy

| Surface | Strategy |
|---|---|
| Desktop ≥1280 | 3-col card grid; detail 2+1; admin sidebar visible |
| Laptop | 2–3 col; tighten paddings |
| Tablet | 2-col cards; admin sidebar collapsible |
| Mobile | 1-col; filter chips in horizontal scroller with fade; sort in dropdown; detail stacked; sticky Apply; header simplified |

**QA checklist:** no horizontal overflow on `/`, `/opportunities`, `/opportunities/[slug]`, `/admin/review`; tap targets ≥44px; sticky header doesn’t hide CTAs.

---

## 12. Technical Implementation Strategy

### Constraints (must honor)
- No removal of functionality
- No DB schema / API / auth / backend logic changes for visual redesign
- No dependency installs until implementation phase approved (font choice may add a Next font — approve first)
- Prefer Tailwind token extension + component extraction

### Suggested file organization (future implementation)

```
web/src/
├── app/                          # routes unchanged
├── components/
│   ├── layout/                   # SiteHeader, SiteFooter, MobileNav
│   ├── opportunities/            # OpportunityCard, OpportunityGrid, Filters, Pagination
│   ├── badges/                   # Verification, Urgency, Category
│   ├── ui/                       # Button, Input, Badge, Panel, EmptyState, Skeleton
│   └── admin/                    # existing + shared shells
├── styles/
│   └── tokens.css                # CSS variables
└── lib/                          # api untouched in redesign phases except UI wiring (pagination params)
```

### Component hierarchy (target)

```
RootLayout
├── TopProgress
├── SiteHeader
├── main
│   ├── HomeView
│   ├── ExploreView
│   │   ├── SearchBar
│   │   ├── FilterBar
│   │   ├── ResultsMeta + Sort
│   │   ├── OpportunityGrid → OpportunityCard[]
│   │   └── Pagination
│   ├── OpportunityDetailView
│   │   ├── DetailHeader
│   │   ├── FlyerBlock?
│   │   ├── ProseSections
│   │   ├── ProvenancePanel
│   │   ├── ActionRail (Apply, Save, Share…)
│   │   └── RelatedRail
│   └── AdminShell
│       ├── AdminNav
│       └── pages…
└── SiteFooter
```

### Styling approach
1. Extend Tailwind with `np.*` tokens  
2. Replace raw slate/indigo sprawl incrementally by route  
3. Delete unused `.pulse-indicator` when touching CSS  
4. Keep `cn()` for variants  

### Data wiring allowed later (UI-only)
- Pass `page` to `fetchOpportunities` / read `meta` if client extended carefully without breaking fallbacks
- Expand city chips (query params already supported)
- Related section = client filter of already-fetched or extra fetch by category — no schema change

---

## 13. Phased Implementation Roadmap

### Phase 1 — Design foundation & tokens
- **Affects:** `tailwind.config.ts`, `globals.css`, `layout.tsx` (font), optional `tokens.css`
- **Changes:** Color/type/spacing/radius; document component API
- **Deps:** None blocking (font swap needs approval)
- **Risks:** Global visual flash if half-migrated
- **Acceptance:** Tokens defined; one Story-less preview page optional; **no route regressions**

### Phase 2 — Global layout & navigation
- **Affects:** `Navbar.tsx`, `Footer.tsx`, `layout.tsx`
- **Changes:** Pakistan positioning; nav IA; remove public Admin primary; mobile nav
- **Deps:** Phase 1 tokens
- **Risks:** Operators lose one-click Admin — mitigate via footer/login
- **Acceptance:** Header/footer match system; mobile menu usable; copy nationwide

### Phase 3 — Homepage
- **Affects:** `app/page.tsx`
- **Changes:** Hero rewrite; stats; categories; latest grid; replace KP banner; simplify how-it-works
- **Deps:** Phase 2 + new card (can stub)
- **Risks:** SEO copy changes — keep meaningful keywords Pakistan-wide
- **Acceptance:** First viewport = brand + search + CTA; no Admin CTA; no empty states broken

### Phase 4 — Explore
- **Affects:** `app/opportunities/page.tsx`, filter components
- **Changes:** City set, sort UI, skeletons, pagination/load more, empty states
- **Deps:** Card component; tokens
- **Risks:** Client search vs API search parity
- **Acceptance:** Filters work; major cities present; no overflow; pagination or documented limit

### Phase 5 — Opportunity detail
- **Affects:** `app/opportunities/[slug]/*`, badges, action buttons, modals
- **Changes:** Layout polish; mobile sticky apply; related section; microcopy
- **Deps:** Card for related
- **Risks:** Long provenance content — keep accessible
- **Acceptance:** Apply path clear; sources reachable; related shows when data allows

### Phase 6 — Admin interface
- **Affects:** `admin/layout.tsx`, `AdminSidebar`, admin pages, `OpportunityEditor`
- **Changes:** Visual alignment; mobile nav; shared inputs/buttons; no workflow changes
- **Deps:** Tokens + ui primitives
- **Risks:** Regressing review save/approve — QA heavily
- **Acceptance:** All admin flows pass manual QA; responsive sidebar

### Phase 7 — Responsive optimization
- **Affects:** All public + admin layouts
- **Changes:** Overflow fixes, sticky bars, tap targets
- **Deps:** Phases 3–6
- **Acceptance:** Device matrix pass

### Phase 8 — Accessibility, performance, QA
- **Affects:** Images, focus states, semantics, animation cutback
- **Changes:** `next/image` where possible, aria, contrast, reduce motion
- **Acceptance:** Checklist in §15 green; Lighthouse a11y improved; no broken APIs

---

## 14. Risks and Considerations

| Risk | Mitigation |
|---|---|
| Half-migrated indigo/slate mix | Token-first; migrate by route |
| Operators need Admin | Footer / auth gate — don’t delete routes |
| National copy vs KP source depth | Honest coverage: “Nationwide directory; strong coverage in … expanding” |
| Font change CLS | Use `next/font` |
| Pagination vs fallback data | Graceful: hide pager when fallback/short lists |
| Auth pages still demo-ish | Visual only until product auth ready |
| Extension / social crawlers | Out of scope |
| Over-scoping related/personalized | Ship related as nice-to-have in Phase 5 |

---

## 15. Final Acceptance Checklist

### Product & brand
- [ ] Reads as Pakistan-wide, not KP-only
- [ ] First viewport communicates opportunity discovery, not ML pipeline
- [ ] Admin not in primary public nav
- [ ] Visual identity distinct from generic indigo AI template

### Design system
- [ ] Tokens for color, type, space, radius applied consistently
- [ ] Shared Button / Input / Badge / Panel used on public pages
- [ ] No glassmorphism on opportunity cards
- [ ] Motion limited and intentional

### Explore & cards
- [ ] Cards scannable; no empty image placeholders
- [ ] Deadline + verification visible
- [ ] Major Pakistan cities + Online filterable
- [ ] Empty, loading, and error states designed
- [ ] Pagination or explicit load-more when catalog exceeds page size

### Detail
- [ ] Apply CTA obvious (sticky on mobile)
- [ ] Provenance understandable in plain language
- [ ] Related opportunities section present when possible

### Admin
- [ ] All existing review/publish/source/curator flows work
- [ ] Visual consistency with public tokens
- [ ] Usable on tablet/mobile

### Quality
- [ ] No horizontal overflow key breakpoints
- [ ] Focus visible; contrast acceptable
- [ ] No API/schema/auth regressions
- [ ] No removed functionality

---

## Appendix A — Existing vs proposed (quick map)

| Capability | Existing | Redesign |
|---|---|---|
| Search | Yes | Elevate; clearer |
| Categories | Yes | Clearer chips ± counts |
| City filter | 3 cities | National major cities |
| Online / urgency | Yes | Keep |
| Sort | Yes | Better control UI |
| Pagination UI | No | Add |
| Opportunity cards | Yes | Full redesign |
| Verification / urgency badges | Yes | Simplify labels |
| Provenance panel | Yes | Keep + plain copy |
| Related opps | No | Add |
| Admin queue | Yes | Visual only |
| For You / Saved / Alerts / Profile | Yes (hidden) | Restyle later; don’t delete |
| Pakistan positioning | Partial / KP-heavy | Primary |

## Appendix B — Copy direction (examples)

**Hero headline:** Find verified opportunities across Pakistan  
**Sub:** Scholarships, hackathons, fellowships, incubators, and research programs — sourced from official portals and confirmed before they go live.  
**Trust line:** Every opportunity links back to its original source.

---

*End of Phase 1 planning document. Awaiting approval before any implementation.*
