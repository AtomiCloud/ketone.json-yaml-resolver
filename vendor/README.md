# Vendored dependencies

`deps.js` is a single-file ESM bundle of the two npm packages this resolver uses, produced by:

```bash
bun build ./vendor/deps.entry.ts --target bun --format esm --outfile ./vendor/deps.js
# where deps.entry.ts is:
#   export { createMerger } from 'smob';
#   export * as YAML from 'yaml';
```

| package | version | licence |
| --- | --- | --- |
| [`yaml`](https://github.com/eemeli/yaml) | 2.8.2 | ISC — © Eemeli Aro |
| [`smob`](https://github.com/tada5hi/smob) | 1.6.0 | MIT — © Peter Placzek |

## Why it is vendored rather than installed

CyanPrint's publish-time bundler (`packages/artifact-bundler/src/build-bundle.ts`) force-resolves the
bare specifiers `yaml` and `smob` to `<packageDir>/index.{js,ts}`, ignoring `main` and `exports`.
Both packages ship subdirectory entries (`yaml` → `./dist/index.js`, `smob` → `dist/index.cjs`), so
`cyanprint test` and `cyanprint push` both fail on them with a non-diagnostic `[error] Bundle failed`.
A **relative** import is never intercepted, so importing this bundle keeps the artifact buildable and
its tests runnable in a clean checkout, with byte-identical behaviour (it is the same library code).

Remove this directory and restore the normal `dependencies` once that bundler behaviour is fixed
upstream and a cyanprint release carrying the fix is pinned.
