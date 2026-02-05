# Test Fixture v1

Copy the contents of this folder (excluding this README) into your Obsidian vault root:

```
<your-vault>/
  projects/
    Project Alpha.md
    Project Beta.md
  tasks/
    Task 1.md
    Task 2.md
    Task 3.md
  tasks.base
```

## How to test

1. Copy files into vault
2. Open `tasks.base`
3. The "Task Table" view shows vanilla Bases (for comparison)
4. Switch to "Relational View" to see the plugin
5. Open Obsidian dev console (Ctrl+Shift+I) to see debug logs prefixed with `[BPU]`

## What to look for

- `note.project` column should render as clickable chips (not raw `[[text]]`)
- A "Project Hours" rollup column should appear (sum of `hours` from linked projects)
- Click "+" on a relation cell to open the note picker
- Double-click `priority` or `done` cells to edit inline
