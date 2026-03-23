import { StartResolverWithLambda } from '@atomicloud/cyan-sdk';
import type { ResolverInput, ResolverOutput } from '@atomicloud/cyan-sdk';
import { createMerger } from 'smob';
import * as YAML from 'yaml';

type ArrayStrategy = 'concat' | 'replace' | 'distinct';

function detectFileType(path: string): 'json' | 'yaml' {
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  throw new Error(`Unsupported file type for path: ${path}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(content: string): Record<string, unknown> {
  const parsed = JSON.parse(content);
  if (!isPlainObject(parsed)) {
    throw new Error('JSON root must be a plain object, got ' + typeof parsed);
  }
  return parsed;
}

function resolveMergeKeys(obj: unknown): unknown {
  if (!isPlainObject(obj)) return obj;
  // Per YAML spec:
  // 1. Explicit keys always take precedence over merge keys.
  // 2. In a merge sequence (<<: [a, b]), earlier mappings override later ones.
  // Process merge-sequence items from last to first so earlier keys win,
  // then spread explicit keys last so they always win.
  let merged: Record<string, unknown> = {};
  const explicit: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '<<') {
      if (Array.isArray(value)) {
        // Process in reverse so earlier mappings in the sequence win
        for (let i = value.length - 1; i >= 0; i--) {
          const resolved = resolveMergeKeys(value[i]);
          if (isPlainObject(resolved)) Object.assign(merged, resolved);
        }
      } else if (isPlainObject(value)) {
        const resolved = resolveMergeKeys(value);
        Object.assign(merged, resolved);
      }
    } else {
      explicit[key] = resolveMergeKeys(value);
    }
  }
  return { ...merged, ...explicit };
}

function resolveMergeKeysObject(obj: Record<string, unknown>): Record<string, unknown> {
  return resolveMergeKeys(obj) as Record<string, unknown>;
}

function parseYaml(content: string): Record<string, unknown> {
  // Reject multi-document YAML
  if (content.includes('---')) {
    const docs = YAML.parseAllDocuments(content);
    // parseAllDocuments always returns at least one doc (even for empty string)
    const nonEmpty = docs.filter((d) => d.contents !== undefined && d.toJS() !== undefined);
    if (nonEmpty.length > 1) {
      throw new Error('Multi-document YAML is not supported');
    }
  }

  const parsed = YAML.parse(content);
  if (!isPlainObject(parsed)) {
    throw new Error('YAML root must be a plain object, got ' + typeof parsed);
  }
  // Deep-clone to break shared references from anchors/aliases
  // and resolve merge keys so stringify produces plain YAML
  return resolveMergeKeysObject(JSON.parse(JSON.stringify(parsed)));
}

function serializeJson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2) + '\n';
}

function serializeYaml(obj: Record<string, unknown>): string {
  return YAML.stringify(obj, { indent: 2 }) + '\n';
}

function getMerger(strategy: ArrayStrategy) {
  switch (strategy) {
    case 'concat':
      return createMerger({ array: true });
    case 'distinct':
      return createMerger({ array: true, arrayDistinct: true });
    case 'replace':
      return createMerger({ array: false, priority: 'right' });
    default:
      return createMerger({ array: true });
  }
}

StartResolverWithLambda(async (input: ResolverInput): Promise<ResolverOutput> => {
  const { config, files } = input;

  if (files.length === 0) {
    throw new Error('Resolver received no files — at least 1 file is required');
  }

  const uniquePaths = new Set(files.map((f) => f.path));
  if (uniquePaths.size > 1) {
    throw new Error(
      `Resolver received files with different paths: ${[...uniquePaths].join(', ')} — all files must have the same path`,
    );
  }

  const path = files[0].path;
  const fileType = detectFileType(path);
  const arrayStrategy = (config.arrayStrategy as ArrayStrategy) ?? 'concat';

  // Sort for commutativity (layer ascending, then template name)
  const sorted = [...files].sort((a, b) => {
    if (a.origin.layer !== b.origin.layer) return a.origin.layer - b.origin.layer;
    return a.origin.template.localeCompare(b.origin.template);
  });

  // Parse all inputs
  const parse = fileType === 'json' ? parseJson : parseYaml;
  const parsed = sorted.map((f) => parse(f.content));

  // Merge all parsed objects
  const merge = getMerger(arrayStrategy);
  const merged = merge(...parsed) as Record<string, unknown>;

  // Serialize back
  const content = fileType === 'json' ? serializeJson(merged) : serializeYaml(merged);

  return { path, content };
});
