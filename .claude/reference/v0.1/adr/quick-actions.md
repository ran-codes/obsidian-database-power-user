# ADR: Quick Actions Column

## Gap

**Problem:** Users want to trigger common frontmatter updates directly from a table row without leaving the view or invoking external tools.

**Example scenario:** A tasks table where each row has a "Mark Done" button that:
- Sets `status: done`
- Sets `completed: 2026-02-05` (today's date)

Currently, users must:
1. Click the row to open the note
2. Manually edit frontmatter, OR
3. Use a separate tool (Claude Code skill, Templater, QuickAdd)

This breaks flow and adds friction for repetitive actions.

**Vanilla Bases:** No support for custom columns, buttons, or actions. Read-only display only.

**Bases Plugin API:** No support for custom column types or cell renderers. Only custom view types.

## Proposal

Add a configurable **Quick Actions column** to the Relational Table view that renders action buttons per row.

### User-facing configuration

In the "Configure view" panel (via `getViewOptions()`), add:

```
Quick Actions: [text field]
```

Format: `label:property=value,property=value;label:property=value`

**Examples:**
- `Done:status=done,completed=TODAY` — single action
- `Done:status=done,completed=TODAY;Archive:archived=true` — multiple actions
- `Low:priority=low;Med:priority=medium;High:priority=high` — priority shortcuts

**Special values:**
- `TODAY` — replaced with current date (YYYY-MM-DD)
- `NOW` — replaced with current datetime (ISO 8601)
- `TRUE` / `FALSE` — boolean values

### Rendering

- Actions column appears as the **last column** (after rollups)
- Each action renders as a small button/chip
- Clicking executes the frontmatter update immediately
- Visual feedback: brief highlight or checkmark on success

### Behavior

- Uses `app.fileManager.processFrontMatter()` for atomic updates
- Multiple properties updated in single operation
- No confirmation dialog (instant action) — keep it fast
- Optional: hold Shift+click for confirmation dialog (future)

## Implementation Notes

### 1. View option registration

In `relational-table-view.ts`, add to `getViewOptions()`:

```typescript
{
  id: 'quickActions',
  name: 'Quick actions',
  description: 'Format: label:prop=value,prop=value;label:prop=value',
  type: 'text',
  default: ''
}
```

### 2. Config parsing

New utility function in `ParseService.ts`:

```typescript
interface QuickAction {
  label: string;
  updates: { property: string; value: string }[];
}

function parseQuickActions(config: string): QuickAction[]
```

Parse the DSL, handle special values (`TODAY`, `NOW`, `TRUE`, `FALSE`).

### 3. Actions column in TanStack Table

In `RelationalTable.tsx`, conditionally add an actions column:

```typescript
if (quickActions.length > 0) {
  columns.push({
    id: '__actions',
    header: 'Actions',
    cell: ({ row }) => <QuickActionsCell actions={quickActions} file={row.original.file} />
  });
}
```

### 4. QuickActionsCell component

New component `components/cells/QuickActionsCell.tsx`:

```typescript
function QuickActionsCell({ actions, file }: { actions: QuickAction[], file: TFile }) {
  const app = useApp();

  const execute = async (action: QuickAction) => {
    await app.fileManager.processFrontMatter(file, (fm) => {
      for (const { property, value } of action.updates) {
        fm[property] = resolveValue(value); // handles TODAY, NOW, etc.
      }
    });
  };

  return (
    <div className="quick-actions">
      {actions.map(action => (
        <button key={action.label} onClick={() => execute(action)}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

### 5. Styling

In `styles.css`:

```css
.quick-actions {
  display: flex;
  gap: 4px;
}

.quick-actions button {
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 4px;
  background: var(--interactive-normal);
  cursor: pointer;
}

.quick-actions button:hover {
  background: var(--interactive-hover);
}
```

### 6. Row refresh

After `processFrontMatter()` completes, the Bases query should auto-refresh (it watches vault changes). If not, may need to manually trigger `this.queryController.refresh()` or similar.

## Future Extensions

- **Conditional actions:** Only show "Done" button if `status != done`
- **Icon-only buttons:** `icon:check:status=done` syntax
- **Confirmation mode:** Shift+click or configurable per-action
- **Undo:** Brief toast with "Undo" link (cache previous values)
- **Custom scripts:** `script:scriptName` to run a user-defined JS function

## Demo

Configure view with: `Done:status=done,completed=TODAY`

| Task | Status | Due | Actions |
|------|--------|-----|---------|
| Fix login bug | todo | 2026-02-10 | [Done] |
| Review PR | in-progress | 2026-02-06 | [Done] |
| Write docs | done | 2026-02-01 | [Done] |

Click [Done] on "Fix login bug" → instantly updates frontmatter:
```yaml
status: done
completed: 2026-02-05
```

Row refreshes to show new status.
