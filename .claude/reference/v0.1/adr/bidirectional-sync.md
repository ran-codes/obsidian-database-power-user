# Bidirectional Relation Sync

## Gap

When a user adds `[[Project Alpha]]` to a task's `project` property, there's no automatic back-link. Project Alpha has no awareness that Task 1 references it. Users must manually edit both notes to maintain both sides of a relation.

In Notion, relations are inherently bidirectional — adding a relation on one side auto-populates the other, and each side has its own property name (e.g. Tasks have `project`, Projects have `tasks`). Obsidian has no equivalent.

## Feature Solution

When a relation cell is edited in the Relational Table view, `BidirectionalSyncService` automatically adds/removes back-links on the target notes using a configurable reverse property name.

### How to Configure

Bidi sync is configured through the **Configure view** panel:

1. Open a `.base` file → switch to **Relational Table** view
2. Open **Configure view**
3. Change **Number of Bidi Syncs** from "None" to "1 relation" (up to 3)
4. Fill in the fields:

| Setting | What to enter | Example |
|---|---|---|
| **Bidi Sync 1: Relation Column** | Property ID of the relation column (with `note.` prefix) | `note.project` |
| **Bidi Sync 1: Write Back-Link To** | Property name to write on the target note (no prefix) | `tasks` |

This means: when you edit Task 1's `project` column and add `[[Project Alpha]]`, the plugin writes `[[Task 1]]` into Project Alpha's `tasks` property. When you remove the link, `[[Task 1]]` is removed from `tasks`.

Without configuration, bidi sync does not run.

### Sync Flow

1. Relation editor commits → `handleUpdateRelation()` reads old links from `BasesEntry`
2. Looks up bidi config for this column → finds the reverse property name
3. `diffLinks()` computes added/removed links (case-insensitive path comparison)
4. For each added link: resolve to TFile → `addBackLink()` appends `[[SourceNote]]` to the reverse property on the target
5. For each removed link: resolve to TFile → `removeBackLink()` filters out `[[SourceNote]]` from the reverse property

**Atomic writes**: Uses `app.fileManager.processFrontMatter()` for each back-link operation. This does an atomic read+write within a single callback, avoiding stale cache race conditions when multiple concurrent edits target the same file.

**Edge cases handled**:
- Target note doesn't exist → skip
- Back-link already present → no-op (no duplicates)
- Target property is not an array → don't modify
- Circular reference (A↔B) → works naturally
- Path normalization → case-insensitive comparison via `toLowerCase()`

**Limitations**:
- Only syncs when edits go through the Relational Table picker UI (not manual YAML edits)
- Only works with `[[wikilink]]` format, not text references
- No cleanup on file deletion (dangling links are harmless)

## Demo Walkthrough (test-v1 fixtures)

**Setup**: Copy `test-v1/` folder contents into your vault.

1. Open `tasks.base` → switch to **Relational View**
2. Open **Configure view** → set **Number of Bidi Syncs** to "1 relation"
3. Fill in:
   - Bidi Sync 1: Relation Column: `note.project`
   - Bidi Sync 1: Write Back-Link To: `tasks`
4. Close the config panel
5. Click **+** on Task 1's PROJECT cell → add "Project Beta" → click away
6. Open `projects/Project Beta.md` → check frontmatter
7. A `tasks` property should appear containing `["[[Task 1]]"]` (or the back-link appended to existing list)
8. Go back to Task 1 → click **×** on "Project Beta" chip to remove it
9. Open `projects/Project Beta.md` again → `[[Task 1]]` should be removed from `tasks`
10. Verify Project Alpha still has its original links intact (no collateral damage)
