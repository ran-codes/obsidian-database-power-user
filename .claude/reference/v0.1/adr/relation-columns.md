# Relation Columns

## Gap

Obsidian Bases has no "relation" property type. Users store references between notes as `[[wikilink]]` lists in frontmatter, but the built-in table renders them as raw text strings like `[[Project Alpha]], [[Project Beta]]`. There's no way to:
- Click a reference to navigate to the linked note
- Add/remove links without manually editing YAML
- Search and select notes from a picker

The Bases Plugin API does not support custom column types or cell renderers in the built-in table.

## Feature Solution

The plugin registers a custom "Relational Table" view via `registerBasesView()` that auto-detects relation columns and renders them with rich UI.

**Detection** (`detectRelationColumn()` in `relational-table-view.ts`): Scans first 10 rows, then falls back to folder matching:
- **1a**: Array where all string items match `WIKILINK_REGEX` → relation
- **1b**: Array where all string items resolve to vault files via `NoteSearchService` → relation (handles Obsidian's LinkValue.data returning bare paths)
- **2**: Scalar string matching a vault file basename or alias (>50% of sampled values) → relation
- **3**: Property name matches a subfolder under the base folder (e.g. `project` → `projects/` exists) → relation. This catches columns that are currently empty but structurally relational.

**Rendering** (`RelationCell.tsx`): Clickable chip pills per link. Click chip → navigate. Click "+" → open picker.

**Picker** (`RelationEditor.tsx`): react-select `CreatableSelect` with:
- Multi-select, searchable, portal-rendered dropdown
- Folder-filtered options (per-column, inferred from property name)
- Create new notes inline by typing a name
- Click-away to persist, Escape to cancel

**Persistence**: Selected links formatted as `[[wikilinks]]` → written to frontmatter via `EditEngineService` debounced queue.

### Picker Folder Filtering

The picker filters notes in two layers so it shows relevant options instead of the entire vault:

1. **Base folder**: derived from entries' common parent folder, one level up
2. **Column folder**: inferred from the property name by matching a subfolder

Given property `note.project` in a base whose entries live under `test-v1/tasks/`:

1. Extract property name: `note.project` → `project`
2. Compute base folder: `test-v1/tasks/` → parent → `test-v1/`
3. Check for matching subfolder using naive singular/plural:
   - `test-v1/project/` — not found
   - `test-v1/projects/` — **found** → use as filter

| Property name | Candidates checked | Logic |
|---|---|---|
| `project` | `project/`, `projects/` | Append `s` |
| `tasks` | `tasks/`, `task/` | Already plural, also strip `s` |
| `organization` | `organization/`, `organizations/` | Append `s` |

This is intentionally naive (just `s`). No stemming, no irregular plurals. If neither candidate exists, falls back to the base folder.

**Data flow**:
```
relational-table-view.ts
  ├── getBaseFolder(entries)      → "test-v1"
  ├── inferRelationFolder(propId) → "test-v1/projects" (or baseFolder fallback)
  └── ColumnMeta.relationFolderFilter = "test-v1/projects"
        ↓
RelationalTable.tsx
  └── meta.getRelationFolder(columnId) → per-column lookup
        ↓
RelationCell.tsx
  └── folderFilter={meta.getRelationFolder(column.id)}
        ↓
RelationEditor.tsx
  └── NoteSearchService.getAllNotes(app, folderFilter)
```

**Limitations**:
- Only handles `s` suffix — won't match `category` → `categories`
- Requires a subfolder to exist with a matching name
- Falls back to base folder (not vault-wide) if no match

## Demo Walkthrough (test-v1 fixtures)

**Setup**: Copy `test-v1/` folder contents into your vault. Open `tasks.base`.

1. Switch to **Relational View** in the view switcher
2. The PROJECT column renders as clickable chips (e.g., "Project Alpha") instead of raw `[[text]]`
3. Click the chip "Project Alpha" → navigates to `projects/Project Alpha.md`
4. Click **+** on Task 3's project cell → picker opens showing only Project Alpha and Project Beta (folder-filtered to `test-v1/projects/`)
5. Select "Project Alpha" → click away → Task 3 now links to both Project Alpha and Project Beta
6. Open `tasks/Task 3.md` → frontmatter now has `project: ["[[Project Beta]]", "[[Project Alpha]]"]`
