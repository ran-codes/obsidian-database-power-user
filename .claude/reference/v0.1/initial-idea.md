# Feasibility brief: Obsidian Bases power-user extension for relations & rollups

## Context

Research conversation on 2026-02-03 exploring how to get Notion-style relations in Obsidian.

## Problem

Obsidian Bases (core plugin, v1.9+) is the official database solution but **lacks key relational features**:

- No relation property type (select from a known set of notes in another base)
- No rollups (aggregate fields from related records)
- No cross-note formula lookups (formulas only access current note's frontmatter)

These are the [most requested features](https://forum.obsidian.md/t/bases-relations-between-notes-from-other-bases-relation-among-bases-intersection/102421) on the Obsidian forum. No ETA from the Obsidian team — not on the [official Bases roadmap](https://help.obsidian.md/bases/roadmap).

## Prior Art (Dead)

**DB Folder plugin** by RafaelGB was the only plugin that had Notion-style relations and rollups in Obsidian. It was archived by its developer and **removed from the community plugin directory in September 2025**. It depended on Dataview as a backend. [Stats page](https://www.moritzjung.dev/obsidian-stats/plugins/dbfolder/)

## Opportunity

Build a **Bases extension plugin** (community plugin) that adds:

1. **Relation columns** — property type that lets you pick notes from a filtered set (like Notion's relation)
2. **Rollup columns** — aggregate a field from related notes (count, sum, average, list)
3. **Cross-note formula support** — access properties of linked notes in formulas

## Key Technical Context for Feasibility

- Bases shipped a **Plugin API** in v1.10 that allows community plugins to create new view types for Bases. Unclear if the API is powerful enough to add new column types or just new views.
- [Obsidian on X about Bases API](https://x.com/obsdmd/status/1957545823799242834)
- [Bases syntax reference](https://help.obsidian.md/bases/syntax)
- All data lives in YAML frontmatter — relations could be stored as `list` properties with `[[wiki links]]`
- Dataview plugin is still actively maintained and could serve as a query engine backend (same approach DB Folder used)
- The Bases `.base` file format and its query/filter syntax would need to be understood

## Questions for Feasibility Agent

1. Does the Bases Plugin API (v1.10) support adding custom column types, or only custom view types?
2. Can a community plugin intercept/extend Bases table rendering to add a relation picker UI?
3. Is it more feasible to build on top of Bases, or as a standalone plugin that reads `.base` files?
4. What's the minimum viable scope — just a relation picker, or do rollups need to ship together?
5. How did DB Folder implement relations technically? (repo is archived but code is still readable on GitHub)
