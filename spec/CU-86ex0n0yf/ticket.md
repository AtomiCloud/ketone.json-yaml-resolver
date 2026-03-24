# Ticket: CU-86ex0n0yf

- **Type**: Feature
- **Status**: complete
- **URL**: https://app.clickup.com/t/86ex0n0yf

## Description

Overview

Repo: ketone.json-yaml-resolver
Artifact: atomi/json-yaml
Language: TypeScript
Purpose: Deep merge JSON and YAML files when multiple CyanPrint templates contribute same file.

Approach

Reuse the smob library (same as reference resolver). Detect file extension (.json vs .yaml/.yml) and parse/serialize accordingly. Deep merge with configurable array strategy.

Commutativity

Sort inputs by (layer ASC, template ASC) before merging. smob merges left-to-right, so sort order determines precedence.

File Matching

Config in template's cyan.yaml:

resolvers:
  - resolver: atomi/json-yaml:1
    files: ['package.json', 'tsconfig.json', '.prettierrc', 'docker-compose.yaml']
    config:
      arrayStrategy: concat  # concat | replace | distinct

Default arrayStrategy: concat.

Array Strategies

concat: merge arrays by concatenation (no dedup)
distinct: merge arrays by concatenation + deduplicate
replace: higher layer replaces entire array (LWW)

Serialization

JSON: JSON.stringify(merged, null, 2) — 2-space indent, trailing newline
YAML: 2-space indent, trailing newline

YAML Handling

Parse with a YAML library (e.g., yaml or js-yaml)
Anchors/aliases: fully resolve on parse (parser default), do not re-introduce on serialize
Comments: stripped during (parse acceptable, not preserved)
Multi-document (--- separators): fail with error (not supported)

Merge Strategy

Validate all inputs have the same file path
Sort inputs by (layer ASC, template ASC)
Detect file type from extension (.json → JSON, .yaml/.yml → YAML)
Parse each input into a JS object
Deep merge using `smob` with configured array strategy
Serialize back to the original format (JSON or YAML)
Return merged content

Example: JSON

Template A (package.json):

{
  "name": "my-app",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.0.0"
  }
}

Template B (package.json):

{
  "scripts": {
    "lint": "eslint .",
    "test": "jest"
  },
  "dependencies": {
    "zod": "^3.0.0"
  }
}

Merged (arrayStrategy: concat):

{
  "name": "my-app",
  "scripts": {
    "build": "tsc",
    "lint": "eslint .",
    "test": [
      "vitest",
      "jest"
    ]
  },
  "dependencies": {
    "express": "^4.0.0",
    "zod": "^3.0.0"
  }
}

Merged (arrayStrategy: replace):

{
  "name": "my-app",
  "scripts": {
    "build": "tsc",
    "lint": "eslint .",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.0.0",
    "zod": "^3.0.0"
  }
}

Example: YAML

Template A (.prettierrc):

semi: true
singleQuote: true
tabWidth: 2

Template B (.prettierrc):

semi: false
printWidth: 120

Merged:

printWidth: 120
semi: false
singleQuote: true
tabWidth: 2

Edge Cases

Empty JSON object {} merged with non-empty: deep merge works naturally
Null values in JSON: treated as real values (not "absent")
YAML with anchors/aliases: resolved on parse, output plain YAML
File type mismatch (.json file with YAML content): fail with error
Invalid JSON/YAML: fail with error
Trailing newline: always append one
Boolean arrayStrategy in smob: true wins (same as nix resolver pattern)
Non-object root (e.g., JSON array [1, 2, 3]): fail with error (expected object root)

Testing Plan

Single file resolution (1 input → passthrough)
Two JSON files, shallow merge (different keys)
Two JSON files, deep merge (nested objects)
JSON array strategy: concat, replace, distinct
YAML file merge
YAML with anchors → output without anchors
YAML with comments → comments stripped, content preserved
Commutativity: same inputs in different order → identical output
Error cases: multi-document YAML, invalid JSON, invalid YAML, type mismatch, array root
Round-trip: parse → merge → serialize → parse produces same object

## Comments

No comments on this task.
