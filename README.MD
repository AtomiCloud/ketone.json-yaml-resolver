# atomi/json-yaml

AtomiCloud's JSON and YAML merger

## Purpose

Deep-merges JSON and YAML files when multiple templates contribute the same file path. Parses based on file extension (`.json`, `.yaml`, `.yml`), deep-merges all inputs using [smob](https://github.com/Tada5hi/smob), and serializes back to the original format. Supports configurable array handling strategies.

Even a single input is parsed and re-serialized (normalization) to ensure well-formed, consistently formatted output.

## Configuration Schema

| Key            | Type     | Default  | Description                                                    |
| -------------- | -------- | -------- | -------------------------------------------------------------- |
| `arrayStrategy` | `string` | `concat` | How to handle array conflicts: `concat`, `replace`, `distinct` |

### Array Strategies

| Strategy   | Behavior                                                                |
| ---------- | ----------------------------------------------------------------------- |
| `concat`   | Concatenate arrays from all layers (duplicates kept)                    |
| `replace`  | Higher layers replace lower layer arrays entirely; scalars also follow right-priority |
| `distinct` | Concatenate arrays and remove duplicate values                           |

## Resolution Strategy

1. **Detect file type** from extension (`.json` → JSON, `.yaml`/`.yml` → YAML)
2. **Sort inputs** by `(layer ASC, template ASC)` for deterministic ordering
3. **Parse** each file into a plain object (rejects non-object roots, multi-document YAML)
4. **Deep-merge** all parsed objects left-to-right using smob with the configured array strategy
5. **Serialize** back to the original format with 2-space indent and trailing newline

### Error Handling

The resolver throws errors for:
- **Non-object root**: JSON arrays `[1, 2, 3]` or YAML scalars are rejected
- **Multi-document YAML**: Files with `---` document separators are rejected
- **Invalid syntax**: Malformed JSON or YAML is rejected (parser errors propagate naturally)
- **Unsupported extensions**: Files not ending in `.json`, `.yaml`, or `.yml`

### YAML-Specific Behavior

- **Anchors/aliases** (`&anchor`, `*anchor`) are resolved on parse; output is plain YAML without anchors
- **Merge keys** (`<<`) are resolved on parse; output contains the merged properties directly
- **Comments** are stripped during parse (not preserved)

## Commutativity and Associativity

CyanPrint may invoke the resolver with files in any order. The resolver ensures identical output regardless of input ordering by:

- **Sorting** all input files by `(layer ASC, template ASC)` before processing
- **Using deterministic merge order** via smob's left-to-right merging with sorted inputs
- **Producing deterministic serialization** with consistent formatting (2-space indent, sorted keys where applicable)

## Merge Examples

### Example 1: JSON Shallow Merge

**Input files** (all sharing path `config.json`):

| Origin Template | Origin Layer | Content                                    |
| --------------- | ------------ | ------------------------------------------ |
| base            | 0            | `{"name": "app", "version": "1.0.0"}`      |
| overlay         | 1            | `{"description": "My app", "license": "MIT"}` |

**Resolved output**:

```json
{
  "name": "app",
  "version": "1.0.0",
  "description": "My app",
  "license": "MIT"
}
```

### Example 2: JSON Deep Merge

**Input files** (all sharing path `config.json`):

| Origin Template | Origin Layer | Content                                                        |
| --------------- | ------------ | -------------------------------------------------------------- |
| base            | 0            | `{"server": {"host": "localhost", "port": 3000}}`              |
| overlay         | 1            | `{"server": {"port": 8080, "ssl": true}, "database": {}}`     |

**Resolved output** (with `arrayStrategy: concat`):

```json
{
  "server": {
    "host": "localhost",
    "port": 8080,
    "ssl": true
  },
  "database": {}
}
```

### Example 3: Array Strategies

**Input files** (all sharing path `config.json`):

| Origin Template | Origin Layer | Content                              |
| --------------- | ------------ | ------------------------------------ |
| base            | 0            | `{"items": ["a", "b"]}`              |
| overlay         | 1            | `{"items": ["b", "c"]}`              |

| Strategy   | Output                        |
| ---------- | ----------------------------- |
| `concat`   | `{"items": ["a", "b", "b", "c"]}` |
| `distinct` | `{"items": ["a", "b", "c"]}`     |
| `replace`  | `{"items": ["b", "c"]}`         |

### Example 4: YAML with Anchors

**Input** (`config.yaml`, single file):

```yaml
common: &defaults
  timeout: 30
  retries: 3

server:
  <<: *defaults
  host: localhost
```

**Resolved output** (anchors resolved, merge keys inlined):

```yaml
common:
  timeout: 30
  retries: 3
server:
  timeout: 30
  retries: 3
  host: localhost
```

## Integration

Reference this resolver in a template's `cyan.yaml`:

```yaml
resolvers:
  - resolver: atomi/json-yaml:1
    config:
      arrayStrategy: concat
    files: ['**/*.json', '**/*.yaml', '**/*.yml']
```

## Contributors

- [json-yaml](mailto:ernest@atomi.cloud)
