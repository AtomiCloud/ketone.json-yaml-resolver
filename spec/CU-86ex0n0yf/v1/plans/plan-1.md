# Plan 1: Implement JSON/YAML Resolver

> Provide direction and suggestions, not exact code. Plans describe HOW to build, not the exact implementation.

## Goal

Implement the complete JSON/YAML deep-merge resolver with configurable array strategy, commutativity guarantees, and comprehensive test coverage.

## Scope

### In Scope

- Full resolver implementation in `index.ts`
- Dependency updates in `package.json`
- Comprehensive test suite in `test.cyan.yaml` with test fixtures
- README.MD documentation

### Out of Scope

- Nothing — this is a self-contained resolver

## Files to Modify

| File               | Change Type | Notes                                     |
| ------------------ | ----------- | ----------------------------------------- |
| `package.json`     | modify      | Add `smob` and `yaml` dependencies        |
| `index.ts`         | modify      | Replace placeholder with full resolver     |
| `test.cyan.yaml`   | modify      | Add comprehensive test cases              |
| `inputs/`          | modify      | Add test fixture directories               |
| `snapshots/`       | modify      | Add expected output snapshots              |
| `README.MD`        | create      | Resolver documentation                    |

## Skills to Use

This repository has Claude Code skills in `.claude/skills/`. The implementer **must** use these skills:

- **`writing-resolver-typescript`** — When implementing `index.ts`. Read the skill's SKILL.md for SDK types (`ResolverInput`, `ResolvedFile`, `ResolverOutput`, `FileOrigin`), entry point patterns, and commutativity requirements. Do NOT implement the resolver without reading this skill first.
- **`testing-resolver`** — When writing tests. Read the skill's SKILL.md and reference.md for `test.cyan.yaml` format, fixture directory layout, and commutativity test patterns. Do NOT write tests without reading this skill first.
- **`documenting-resolver`** — When generating README.MD. Read the skill's SKILL.md and reference.md for the documentation template.

## Technical Approach

### 1. Update Dependencies

Add `smob` and `yaml` to `package.json` dependencies. Run `bun install` to generate lockfile.

### 2. Implement Resolver Logic in `index.ts`

Structure the resolver as follows:

**a) File type detection** — Extract extension from the resolved file path. Map `.json` → `'json'`, `.yaml`/`.yml` → `'yaml'`. All files in a conflict set must have the same path (enforced by the engine), so detect type once.

**b) Input validation** — Verify all input files share the same path (safety check). Sort by `(layer ASC, template ASC)` for commutativity.

**c) Parse** — JSON: `JSON.parse(content)`. YAML: `yaml.parse(content)`. After parsing, validate root is a plain object (not array, string, number, etc.). For YAML, check that the parsed result is a single document (the `yaml` library returns the first document by default; reject if content has `---` separators by checking for multiple documents).

**d) Merge** — Use `smob.createMerger()` with array strategy mapped from config:
- `concat` (default): `{ array: true }`
- `distinct`: `{ array: true, arrayDistinct: true }`
- `replace`: `{ array: false, priority: 'right' }`

Merge all parsed objects left-to-right after sorting.

**e) Serialize** — JSON: `JSON.stringify(merged, null, 2) + '\n'`. YAML: `yaml.stringify(merged, { indent: 2 }) + '\n'`. Ensure trailing newline on all output.

**f) Error handling** — Wrap parse/merge in try/catch. Let parser errors propagate naturally for invalid input. Add explicit checks for non-object root and multi-document YAML.

### 3. Write Tests

Create test fixture directories under `inputs/` and expected snapshots under `snapshots/`. Each test case in `test.cyan.yaml` defines:
- `resolver_inputs`: array of input directories (each with origin `layer` + `template`)
- `config`: resolver config (e.g., `arrayStrategy`)
- `expected`: snapshot path or inline content

Test cases to cover (see task-spec Testing Requirements section):
1. Single file passthrough (normalization)
2. JSON shallow merge
3. JSON deep merge (nested objects)
4. JSON concat arrays
5. JSON replace arrays
6. JSON distinct arrays
7. YAML scalar merge
8. YAML nested merge
9. YAML with anchors → plain output
10. Commutativity (same inputs, different order)
11. Error: multi-document YAML
12. Error: invalid JSON
13. Error: invalid YAML
14. Error: non-object root (JSON array)

### 4. Generate Documentation

Use the documenting-resolver skill to generate `README.MD` covering config schema, merge behavior, and usage examples.

## Edge Cases to Handle

- **Single input**: Parse + re-serialize even with one file (normalization)
- **Empty object**: `{}` merged with non-empty — smob handles naturally
- **Null values**: Treated as real values by smob
- **YAML anchors/aliases**: `yaml.parse` resolves them; output is plain YAML
- **Multi-document YAML**: Detect via `yaml.parseAll` vs `yaml.parse` or check for `---` in content
- **Non-object root**: Check `typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)` after parsing
- **Trailing newline**: Always append `'\n'` to serialized output

## How to Test

1. Add dependencies: `bun install`
2. Write test fixtures in `inputs/` and `snapshots/`
3. Add test cases to `test.cyan.yaml`
4. Run `cyanprint test resolver .` — all tests must pass
5. Use `--update-snapshots` to generate initial snapshots if needed
6. Run `cyanprint test resolver . --verbose` for debug output

## Integration Points

- **Depends on**: Nothing (self-contained resolver)
- **Blocks**: Nothing (final deliverable)
- **Shared state**: `cyan.yaml` resolver metadata (already exists)

## Implementation Checklist

- [ ] Add `smob` and `yaml` to `package.json`, run `bun install`
- [ ] Implement file type detection from extension
- [ ] Implement JSON parse/serialize (2-space indent, trailing newline)
- [ ] Implement YAML parse/serialize (2-space indent, trailing newline)
- [ ] Implement input sorting by `(layer ASC, template ASC)`
- [ ] Implement `smob.createMerger` with array strategy mapping
- [ ] Implement non-object root validation
- [ ] Implement multi-document YAML detection and error
- [ ] Wire everything into `StartResolverWithLambda` entry point
- [ ] Write test fixtures and test cases in `test.cyan.yaml`
- [ ] Run `cyanprint test resolver .` — all tests pass
- [ ] Generate `README.MD`

## Success Criteria

- [ ] `cyanprint test resolver .` passes all test cases
- [ ] Single input produces normalized output (valid format, trailing newline)
- [ ] Multiple inputs deep-merge correctly with all three array strategies
- [ ] Commutativity: same inputs in different order produce identical output
- [ ] Error cases throw appropriate errors
- [ ] README.MD documents config schema and usage
