# ARS Admin Console — v0.1 Build Plan (rev 2)

Desktop HUMINT handler console. Tactical visual language, four screens, Supabase-backed, with hard separation between source true identity and operational pseudonyms.

## Scope (v0.1)

In: Login · Dashboard · Sources · Register Source (form + success modal).
Out: Validation Queue, Tasking Composer, audit log UI, map, mobile app, realtime, Resolve True Identity workflow, US-persons gate.

## Step 1 — Scaffold & backend

- Enable Lovable Cloud.
- Add Google Fonts: Rajdhani, IBM Plex Sans, JetBrains Mono.
- Define design tokens in `src/styles.css` from the JSX:
  - `--amber #C9A961`, `--amber-dim #8A7340`, `--red #DC2626`, `--red-light #FCA5A5`, `--green #10B981`, `--orange #F59E0B`, `--bg #0A0B0D`, `--panel #111316`, `--hairline rgba(201,169,97,0.18)`, `--hairline-strong rgba(201,169,97,0.45)`, `--classification-red #991B1B`.
  - Override base background/foreground; sharp corners by default (no rounding on cards/buttons/panels).
- Port shared primitives to TS: `CornerBrackets`, `SectionLabel`, `Pill`, `ClassificationBanner`, `PrimaryButton`, `SecondaryButton`, `PlaceholderBadge` (new — see Step 5).

## Step 2 — Schema, RLS, RPC

Tables (per §6): `handlers`, `source_registry`, `sources_operational`, `pairing_codes`.

RLS:
- `handlers`: a row is readable by its own auth user.
- `source_registry`: **default-deny** for all client roles. No SELECT/INSERT/UPDATE/DELETE policies. Access only via SECURITY DEFINER functions.
- `sources_operational`: handler can SELECT/UPDATE only rows where `handler_id` = their handler row.
- `pairing_codes`: issuing handler can SELECT only their own issued codes.

`register_source` SECURITY DEFINER PL/pgSQL (per §7):
1. Resolve caller's handler row from `auth.uid()`; reject if none.
2. Insert into `source_registry`.
3. Generate unique `S-XXXX` (1000–9999), looping until free **with a hard cap of 50 attempts**. On exhaustion, raise `PseudonymSpaceExhausted` with SQLSTATE `P0001` and a clear message — the form maps this to a user-visible "Pseudonym space exhausted, contact admin" error.
4. Insert into `sources_operational` (status `pending_vetting`, linked via `registry_id`).
5. Generate 6-digit numeric code, insert into `pairing_codes` with `expires_at = now() + 15m`.
6. Return `{ source_id, pseudonym, code, expires_at }`.

In-function comment (verbatim):
```
-- v0.1 policy: pseudonyms are PERMANENT. Once assigned, a pseudonym is never
-- reused, even after a source is terminated/decommissioned. The 9000-slot
-- space (1000–9999) is sized for POC scale only. The 50-retry cap exists to
-- detect near-exhaustion and force an operator decision (widen the format,
-- partition by AOR, etc.) rather than degrading silently.
```

Helper SECURITY DEFINER `current_handler_id()` for RLS predicates.

## Step 3 — Seed

Migration creates the WALKER-3 auth user (`walker3@ars.demo` / `ChangeMeAtFirstLogin!2026`), the matching `handlers` row, plus the four sources from §8 in both tables.

**Synthetic true names — obviously fake, demo-only:**

| Pseudonym | Seeded true_name in `source_registry` |
| --- | --- |
| S-7421 | DEMO_SUBJECT_ALPHA (Synthetic Persona — Not A Real Person) |
| S-3892 | DEMO_SUBJECT_BRAVO (Synthetic Persona — Not A Real Person) |
| S-1156 | DEMO_SUBJECT_CHARLIE (Synthetic Persona — Not A Real Person) |
| S-4407 | DEMO_SUBJECT_DELTA (Synthetic Persona — Not A Real Person) |

DOBs use `1970-01-01`. ID document numbers use `DEMO-0000-0001` … `DEMO-0000-0004`. Vetting notes: `"Synthetic POC record — not a real source."` These values are unreachable from any client query (firewalled table) but are still scrubbed of anything name-shaped so a screenshot leak is harmless.

## Step 4 — Login (`/login`)

Sober centered card on `--bg`, ARS wordmark in Rajdhani, email + password, primary amber Sign In. CornerBrackets on the card. Classification banner top + bottom (see Step 5 for text).

**Demo-auth banner** beneath the form, matching the source app's auth-banner treatment (single line, mono, 9px, `--amber-dim`, no border, centered):

> `POC demo auth · production uses PIV/CAC + unit SSO`

On success → `/`.

**Mid-session expiry behavior (documented for v0.1):**
- The Supabase browser client auto-refreshes tokens; expiry only surfaces if the refresh token is revoked or the user is offline past expiry.
- The `_authenticated` layout subscribes to `supabase.auth.onAuthStateChange`. On `SIGNED_OUT` or a failed refresh it redirects to `/login` with a toast: `"Session expired. Sign in to continue."`
- If the handler is mid-form on `/sources/new` when expiry fires: form state is **discarded** in v0.1. The toast wording warns: `"Session expired. Any unsaved source registration was discarded."`
- Cross-login form preservation is explicitly out of scope for v0.1 (noted as a v0.2 candidate). Rationale: persisting partial true-identity data in `localStorage` would breach the firewall; a server-side draft table is over-scope for the POC.

## Step 5 — Dashboard (`/`, under `_authenticated`)

**Classification banner** (top + bottom, every page — replaces the mockup's UNCLASSIFIED // FOUO):

> `DEMO // SIMULATED HUMINT // NOT REAL INTELLIGENCE`

Same red-bar visual treatment as the mockup. Single token in code so it can be swapped per environment later.

**Placeholder badges.** New `PlaceholderBadge` primitive: small dim chip, `--amber-dim` text on transparent bg, JetBrains Mono 9px, letter-spacing 0.14em, content `PLACEHOLDER · v0.1`, anchored to the panel's top-right corner inside the CornerBrackets frame. Renders on every panel that is not wired to live data. Goal: a demo viewer can never mistake static counts for real intelligence.

| Panel | Data source | Badge? |
| --- | --- | --- |
| Operator card (sidebar) | live (`handlers`) | no |
| Sources count (sidebar) | live (`sources_operational` count) | no |
| Source Health table | live (`sources_operational` for current handler) | no |
| KPI strip (5 tiles) | static | yes |
| Force Protection alerts | static | yes |
| PIR Heatmap | static | yes |
| Validation Queue preview | static | yes |
| Active Taskings | static | yes |
| AOR Map | static | yes |
| Tasking Recommendations | static | yes |
| Recent Activity | static | yes |

Layout otherwise per the HTML mockup: 232px sidebar (brand, operator card, nav grouped Operations / Intelligence / Oversight, footer), top header (breadcrumb, search, alert bell, actions), toolbar (time window, AOR filter, PIR filter, refresh, export). Every panel wrapped in CornerBrackets; section headers use `── SECTION LABEL`.

## Step 6 — Sources (`/sources`)

Full-width table scoped to the logged-in handler. Columns: Pseudonym (mono amber), Source Type pill, Reliability badge (A–F), AOR, Status pill, Last Contact (relative). Row click → right-side detail drawer showing the same fields larger (no true name, no `registry_id` exposed). `+ Register Source` top-right opens `/sources/new`.

## Step 7 — Register Source (`/sources/new`)

Form fields per §5.4. Submit → `supabase.rpc('register_source', {...})`.

Error mapping:
- `PseudonymSpaceExhausted` → toast `"Pseudonym space exhausted — contact admin."`
- Auth failure / not a handler → redirect to `/login` per Step 4 expiry rules.
- Generic failure → toast with the Postgres message.

On success, modal:
- Title `SOURCE REGISTERED`
- Pseudonym (large mono amber)
- 6-digit code (large mono)
- 15-minute live countdown from `expires_at`
- Warning: `"Hand this code to the source in person. Do not transmit electronically."`
- Done → close, back to `/sources`, list refetched.

Cancel returns to `/sources` without submitting.

## Step 8 — Visual polish pass

Sweep every screen: CornerBrackets on every panel/card/modal, classification banners present with the new text, PLACEHOLDER badges present on every static panel and absent on every live one, no rounded corners except avatars/icon containers, all data in JetBrains Mono, no emoji, lucide stroke icons only, orange (not red) for "priority", no Tailwind default colors leaking in.

## Technical notes

- Routes: `src/routes/login.tsx` (public), `src/routes/_authenticated.tsx` (gate via `supabase.auth.getUser()` in `beforeLoad`, redirect to `/login` on miss; subscribes to `onAuthStateChange` for mid-session expiry), `src/routes/_authenticated/index.tsx` (Dashboard), `src/routes/_authenticated/sources.tsx`, `src/routes/_authenticated/sources.new.tsx`.
- Sidebar/header/banners live in `_authenticated.tsx` shell.
- All Supabase reads use the browser client; RLS scopes to the handler. `register_source` invoked via `supabase.rpc` from the browser.
- Source identity firewall: UI never selects from `source_registry` and never displays `registry_id` or true names anywhere.
- Tailwind theme extended with the exact hex tokens; default `border-radius` overridden to `0` for cards/buttons/panels.

## Out of scope (v0.1)

Mobile app, Validation Queue, Tasking Composer, full Source Detail page, audit log UI, real map, realtime subs, Resolve True Identity, US-persons gate, reliability entry UI, live Tasking Recommendations, Spanish, cross-login form preservation.

## Stop point

After Step 8 I stop and wait for your round-trip review.