# Obsidian Value API — Runtime Reference

Discovered via runtime inspection (2026-02-04). The `.d.ts` types don't expose runtime property names due to minification.

## Value Class Hierarchy

```
Value (abstract base)
├── NullValue
├── NotNullValue (abstract)
│   ├── DateValue → RelativeDateValue
│   ├── DurationValue
│   ├── FileValue
│   ├── ListValue
│   ├── ObjectValue
│   ├── PrimitiveValue<T> (abstract)
│   │   ├── BooleanValue (T=boolean)
│   │   ├── NumberValue (T=number)
│   │   └── StringValue (T=string)
│   │       ├── HTMLValue
│   │       ├── IconValue
│   │       ├── ImageValue
│   │       ├── LinkValue
│   │       ├── TagValue
│   │       └── UrlValue
│   └── RegExpValue
```

## Runtime Object Shape

All Value objects have these properties (minified names map to):

| Runtime property | Type | Description |
|---|---|---|
| `icon` | string | Icon identifier for display |
| `data` | any | The actual wrapped value |
| `lazyEvaluator` | function \| undefined | Present on list/computed properties |

**Key**: the `.data` property replaces what the `.d.ts` suggests as constructor args. The type definitions show `PrimitiveValue<T>` takes `value: T` in its constructor, but at runtime the stored property is named `data`.

## .data Contents by Type

| Value type | `.data` contains | Example |
|---|---|---|
| StringValue | `string` | `"high"` |
| NumberValue | `number` | `42` |
| BooleanValue | `boolean` | `true` |
| LinkValue | `string` (the raw wikilink or path) | `"[[Project Alpha]]"` or `"Project Alpha"` |
| TagValue | `string` | `"#task"` |
| ListValue | `Value[]` (array of Value objects) | `[LinkValue, LinkValue, ...]` |
| FileValue | unknown (has `.path`) | file reference |
| DateValue | unknown | date value |

## ListValue API (from .d.ts)

```typescript
class ListValue extends NotNullValue {
    constructor(value: (unknown | Value)[]);
    toString(): string;            // comma-separated string representation
    isTruthy(): boolean;
    includes(value: Value): boolean;
    length(): number;
    get(index: number): Value;     // returns NullValue if out of bounds
    concat(other: ListValue): ListValue;
}
```

## BasesEntry.getValue()

```typescript
getValue(propertyId: BasesPropertyId): Value | null;
```

Returns a Value subclass. For list frontmatter properties, returns `ListValue` whose `.data` is `Value[]`.

## Correct Unwrapping Pattern

```typescript
function unwrapValue(value: any): unknown {
    if (value === null || value === undefined) return null;

    // Value objects have .data containing the actual value
    if (value.data !== undefined) {
        if (Array.isArray(value.data)) {
            return value.data.map(v => unwrapValue(v));
        }
        return unwrapValue(value.data);  // recurse for nested Values
    }

    // Primitives pass through
    return value;
}
```

## Important Caveats

- Constructor names are minified at runtime (all show as `t`)
- Prototype chain is deeply nested: `t->t->t->t->e`
- `.values` and `.value` do NOT exist on Value objects — use `.data`
- `toString()` on the top-level Value returns a display string (e.g., comma-joined for lists)
- LinkValue.data may or may not include `[[]]` brackets — detection must handle both
