# Task Specification: JSON/YAML Resolver (atomi/json-yaml) (CU-86ex0n0yf)

## Source

- Ticket: CU-86ex0n0yf
- System: ClickUp
- URL: https://app.clickup.com/t/86ex0n0yf

## Summary

Build a CyanPrint resolver that deep-merges JSON and YAML files when multiple templates contribute the same file path. Uses `smob` for merging with configurable array strategy (`concat`, `replace`, `distinct`). Parses based on file extension, serializes back to the original format.

## Acceptance Criteria

- [ ] Resolver parses JSON files (`.json`) and YAML files (`.yaml`, `.yml`) based on extension
- [ ] Deep merges all inputs for the same file path using `smob`
- [ ] Supports three array strategies via config: `concat` (default), `replace`, `distinct`
- [ ] Sorts inputs by `(layer ASC, template ASC)` before merging for commutativity
- [ ] JSON output: `JSON.stringify(merged, null, 2)` with trailing newline
- [ ] YAML output: 2-space indent with trailing newline
- [ ] Single input is normalized (parse + re-serialize) for consistent output
- [ ] Fails on: multi-document YAML, non-object root values, invalid JSON/YAML
- [ ] YAML anchors/aliases are resolved on parse, output is plain YAML
- [ ] YAML comments are stripped (acceptable)
- [ ] Passes all test cases via `cyanprint test resolver .`

## Out of Scope

- Preserving YAML comments
- Preserving YAML anchors/aliases in output
- Multi-document YAML support
- Non-JSON/YAML file formats
- Custom merge strategies beyond the three array strategies

## Constraints

- Must use `smob` library for deep merging (zero-dependency, supports all needed array strategies natively)
- Must use `yaml` library (eemeli/yaml) for YAML parse/serialize
- Must ensure commutativity: same inputs in any order produce identical output
- Must ensure associativity: merge is deterministic and consistent
- Entry point is `index.ts` using `StartResolverWithLambda` from `@atomicloud/cyan-sdk`
- Resolver runs in Bun runtime (see Dockerfile)

## Context

### smob Array Strategy Mapping

| Strategy   | `createMerger` config                               |
|------------|-----------------------------------------------------|
| `concat`   | `{ array: true }` (default)                         |
| `distinct` | `{ array: true, arrayDistinct: true }`              |
| `replace`  | `{ array: false, priority: 'right' }`               |

### YAML Library Choice

Use `yaml` (eemeli/yaml) — modern, actively maintained, spec-compliant. Anchors/aliases resolved by default on parse. `js-yaml` is unmaintained.

### Single Input Behavior

Even with a single input, parse and re-serialize. This validates the file is well-formed and ensures consistent output formatting (2-space indent, trailing newline). Silent passthrough of malformed content would hide bugs.

### File Type Detection

Trust the file extension. `.json` → `JSON.parse`/`JSON.stringify`, `.yaml`/`.yml` → `yaml` library. If content doesn't match the extension, the parser will throw naturally with a clear error message.

### Existing Codebase State

- `index.ts` exists as a placeholder (returns first file as-is)
- `package.json` has `@atomicloud/cyan-sdk` but missing `smob` and `yaml`
- `test.cyan.yaml` has one basic test case (single input, not testing conflict resolution)
- Dockerfile, CI/CD (GitHub Actions), and project structure are ready

## Edge Cases

- **Empty JSON object `{}` merged with non-empty**: deep merge works naturally via smob
- **Null values in JSON**: treated as real values (not "absent") — smob's default behavior
- **YAML with anchors/aliases**: resolved on parse, output is plain YAML without anchors
- **YAML with comments**: comments stripped during parse, content preserved
- **Multi-document YAML** (`---` separators): throw an error (not supported)
- **Non-object root** (e.g., JSON array `[1, 2, 3]`): throw an error — resolver expects object roots
- **Invalid JSON/YAML**: let parser throw naturally — error messages are clear
- **Mismatched extensions**: trust extension, let parser fail if content doesn't match

## Testing Requirements

Test via `cyanprint test resolver .` using `test.cyan.yaml`:

1. Single file resolution (1 input → normalized passthrough)
2. Two JSON files, shallow merge (different keys)
3. Two JSON files, deep merge (nested objects)
4. JSON array strategy: `concat`, `replace`, `distinct`
5. YAML file merge (scalar + nested)
6. YAML with anchors → output without anchors
7. Commutativity: same inputs in different order → identical output
8. Error cases: multi-document YAML, invalid JSON, invalid YAML, non-object root
9. Round-trip: parse → merge → serialize → parse produces same object

## Implementation Checklist

### Dependencies

- [ ] Add `smob` to `package.json`
- [ ] Add `yaml` to `package.json`

### Code

- [ ] Implement file extension detection (`.json`, `.yaml`, `.yml`)
- [ ] Implement JSON parse/serialize with 2-space indent + trailing newline
- [ ] Implement YAML parse/serialize with 2-space indent + trailing newline
- [ ] Implement multi-document YAML detection and error
- [ ] Implement non-object root validation
- [ ] Implement input sorting by `(layer ASC, template ASC)`
- [ ] Implement `smob.createMerger` with array strategy mapping
- [ ] Wire everything into `StartResolverWithLambda` entry point

### Testing

- [ ] Write comprehensive `test.cyan.yaml` covering all test cases listed above
- [ ] Run `cyanprint test resolver .` and ensure all tests pass
- [ ] Update snapshots as needed with `--update-snapshots`

### Documentation

- [ ] Generate `README.MD` using documenting-resolver skill
