# Initial Feasibility Evaluation — 2026-02-03

## Verdict: Feasible

Building a community plugin that adds relation and rollup features on top of Obsidian Bases is technically viable and addresses strong unmet demand.

---

## Market Gap

- Relations and rollups are the #1 community request for Bases
- Not on the official Obsidian roadmap — no ETA
- DB Folder (the only prior solution) archived July 2025, removed from plugin directory September 2025
- No existing community plugin fills this gap
- Users are explicitly waiting for a solution
- The only current workaround (`file()` + `Link.asFile()` formulas) has performance issues and no auto-refresh

## Bases Plugin API (v1.10.0) — Capabilities

What the API supports:
- Register custom view types via `registerBasesView(type, registration)`
- Receive filtered/sorted query results (`BasesQueryResult` with `BasesEntry[]`)
- Declare configurable view options (dropdowns, sliders, property pickers, toggles, etc.)
- Render any UI in the view's `containerEl`
- Access all note properties via `BasesEntry.getValue(propertyId)`
- Create new files with pre-configured frontmatter

What the API does NOT support:
- Custom column types in the built-in table
- Custom cell renderers in the built-in table
- Custom formula functions
- Custom filter operators
- Intercepting or modifying query results before rendering
- Listening for individual cell/row interaction events

Key implication: you cannot extend the built-in table — you must build your own table view.

## Architecture Decision: Approach A — Custom Bases View

Three approaches were evaluated:

| Approach | Description | Verdict |
|---|---|---|
| **A: Custom Bases View** | Build a full custom table registered via `registerBasesView()` | **Selected** — official API, inherits query engine, reliable |
| B: Sidebar/Modal helper | Separate picker UI that writes `[[wikilinks]]` to frontmatter | Too clunky, no rollup support |
| C: Monkey-patch built-in table | Intercept internal rendering to inject custom cells | Fragile, undocumented, high maintenance risk |

## Table Library Decision: TanStack Table

| Option | Verdict |
|---|---|
| **TanStack Table** | **Selected** — MIT, headless, Svelte/React/vanilla, 27.7k stars, proven in DB Folder |
| Rowstack | Rejected — $199 commercial, cannot redistribute in open-source community plugin |
| editable-react-table | Rejected — maintenance mode, missing types, custom internals, author moved to Rowstack |

TanStack Table is headless (no built-in UI), which is correct for this use case since the core feature cells (relation pickers, rollup displays) require custom renderers anyway.

## Data Model

- Relations stored as `list` properties with `[[wikilinks]]` in YAML frontmatter
- Compatible with Obsidian graph, Dataview, Bases, and all other plugins
- Same approach DB Folder used successfully
- Written via `app.fileManager.processFrontMatter()` (official API)

## Lessons from DB Folder (archived)

What worked:
- Dataview as query backend
- Wiki-links in frontmatter for relations
- `CreatableSelect` (react-select) for relation picker UX — search + create inline
- Column config stored in the database note's YAML
- TanStack Table for the grid

What to avoid:
- Bidirectional relations were the most fragile feature (race conditions, multi-file atomic writes)
- React added ~40KB bundle overhead — consider Svelte
- Over-engineered state management (custom Zustand-like stores)
- Hard Dataview dependency — consider using `app.metadataCache` instead for simpler queries

## Key Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Bases API changes (still "beta") | Medium | Abstract view logic from API surface; track changelogs |
| Obsidian ships native relations | Low-Medium | Not on roadmap; plugin fills gap until then |
| Table UI effort underestimated | High | Use TanStack Table; don't build from scratch |
| Bidirectional sync race conditions | High | Defer to Phase 3; use write queue with debouncing |
| Solo maintainer burnout | Medium | Keep scope tight; ship MVP fast |

## Framework Decision: React

Svelte is the Obsidian community convention (smaller bundle, compile-to-vanilla-JS), but React wins for this specific project:

- TanStack Table's "Editable Data" example — the most relevant example for this plugin — works for React but is broken/404 for Svelte
- React adapter: 6.6M weekly downloads, 20+ examples. Svelte adapter: 10.9K downloads, 7 examples (600:1 ratio)
- The Svelte adapter is frozen on Svelte 4; Svelte 5 support requires TanStack Table v9 (alpha, no release date)
- ~40KB React runtime overhead is acceptable for a feature-rich table plugin (total ~80-120KB vs ~50-80KB with Svelte)
- DB Folder proved React + TanStack Table works in Obsidian for exactly this use case
