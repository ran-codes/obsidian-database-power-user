# Plan Phases

## Phase 1 — MVP: Custom Bases View with Relations

- [ ] Scaffold Obsidian plugin project (manifest.json, package.json, tsconfig, esbuild, React)
- [ ] Register a custom Bases view type via `registerBasesView()`
- [ ] Build minimal table renderer: columns from `BasesQueryResult.properties`, rows from `BasesEntry[]`
- [ ] Implement column sorting via `BasesViewConfig.getSort()`
- [ ] Implement column reordering via `BasesViewConfig.getOrder()`
- [ ] Add relation column type: detect `list` properties containing `[[wikilinks]]`
- [ ] Build relation picker modal: search notes, select multiple, save to frontmatter
- [ ] Write selected relations to frontmatter via `app.fileManager.processFrontMatter()`
- [ ] Render relation cells as clickable wiki-link chips
- [ ] Add view option: configure which property is the "relation" column
- [ ] Test with real `.base` files and verify data round-trips correctly
- [ ] Submit to Obsidian community plugin directory

## Phase 2 — Rollups

- [ ] Add rollup column type to the custom view
- [ ] For each row, resolve relation links and fetch linked notes' properties
- [ ] Implement aggregation functions: count, sum, average, list values
- [ ] Add view options: select relation column, target property, aggregation type
- [ ] Render rollup values in cells
- [ ] Optimize: cache resolved note data per render cycle to avoid redundant reads

## Phase 3 — Bidirectional Relations + Polish

- [ ] Implement bidirectional relation sync: when adding a link in note A, add back-link in note B
- [ ] Use a debounced write queue (250ms) to batch frontmatter edits
- [ ] Handle edge cases: deleted notes, renamed notes, broken links
- [ ] Add column resizing
- [ ] Add inline cell editing for non-relation columns (text, number, checkbox)
- [ ] Add grouping support using `BasesQueryResult.groupedData`
- [ ] Add summary row using `BasesQueryResult.getSummaryValue()`
- [ ] Keyboard navigation (arrow keys, enter to edit, escape to cancel)
