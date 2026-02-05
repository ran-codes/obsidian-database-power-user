# Rollup Columns

## Gap

Obsidian Bases has no way to aggregate data across linked notes. If you have tasks linked to projects, there's no built-in mechanism to show:
- How many tasks each project has
- The sum of hours across linked tasks
- Whether all linked items are complete

Dataview can do this via queries, but not inside a Bases table view. The only workaround (`file()` + `Link.asFile()` formulas) has performance issues and no auto-refresh.

## Feature Solution

Rollup columns are **virtual columns** — they don't exist as Bases properties. The plugin computes them client-side on every render by following relation links, reading frontmatter from linked notes, and aggregating the results. They only appear in the Relational Table view.

### How to Configure

Rollups are configured through the **Configure view** panel in Bases.

1. Open a `.base` file → switch to **Relational Table** view
2. Open **Configure view** (click the view name or `⋮` menu at the top of the base)
3. Change **Number of Rollups** from "None" to "1 rollup column" (up to 3)
4. Fill in the fields that appear:

| Setting | What to enter | Example |
|---|---|---|
| **Rollup 1: Relation Property** | Property ID of the relation column (must include `note.` prefix) | `note.project` |
| **Rollup 1: Target Property** | Frontmatter key on the linked notes to read | `hours` |
| **Rollup 1: Aggregation** | How to combine the values (dropdown) | `Sum` |
| **Rollup 1: Column Name** | Header label for the rollup column | `Project Hours` |

5. Close the panel — the rollup column appears at the right side of the table

### Pipeline

```
getRollupConfigs() → parse view options via config.get()
  → RollupService.computeRollups(app, rows, configs)
    → for each row: resolveLinks() → readProperty() → aggregate()
  → inject values into row data
  → add rollup ColumnMeta entries
```

**10 aggregation functions**: count, count_values, sum, average, min, max, list, unique, percent_true, percent_not_empty

**Caching**: Per-render-cycle `Map<filePath, frontmatter>` avoids reading the same file's metadata multiple times. Discarded after each render — no stale data risk.

**Link resolution** (`resolveLinks()`): Handles both `[[wikilink]]` arrays and plain-text references that match file basenames.

## Demo Walkthrough (test-v1 fixtures)

**Setup**: Copy `test-v1/` folder contents into your vault.

1. Open `tasks.base` → switch to **Relational View**
2. Open **Configure view** → set **Number of Rollups** to "1 rollup column"
3. Fill in:
   - Rollup 1: Relation Property: `note.project`
   - Rollup 1: Target Property: `hours`
   - Rollup 1: Aggregation: `Sum`
   - Rollup 1: Column Name: `Project Hours`
4. Close the panel — a "Project Hours" column appears at the right side of the table
4. Task 1 links to Project Alpha (hours: 10) → rollup shows **10**
5. Task 2 links to Project Alpha + Project Beta (hours: 10+25) → rollup shows **35**
6. Task 3 links to Project Beta (hours: 25) → rollup shows **25**
7. Change aggregation to "count" → column shows **1, 2, 1** (link counts)
8. Change target property to "status", aggregation to "list" → shows **"Active", "Active, Active", "Active"**

**If rollup shows 0 or empty**:
- Verify the relation property ID includes the `note.` prefix (e.g., `note.project`)
- Verify linked notes have the target property in their frontmatter
- Check that linked notes are resolvable (not broken links)
