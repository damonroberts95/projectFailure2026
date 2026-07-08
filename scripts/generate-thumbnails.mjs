// Generates a generic on-brand thumbnail for any resource that doesn't set its own
// `ogImage`. Resources with a hand-made ogImage (e.g. the-isolator) are left
// untouched. Drawing logic lives in scripts/lib/thumbnail.mjs — see
// scripts/test-thumbnails.mjs for a per-icon visual test harness.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateThumbnail } from './lib/thumbnail.mjs';
import { parseFrontmatter, listContentFiles } from './lib/frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const resourcesDir = path.join(root, 'src/content/resources');
const outDir = path.join(root, 'public/images/generated');

mkdirSync(outDir, { recursive: true });

const files = listContentFiles(resourcesDir);
let generated = 0;

for (const file of files) {
	const slug = file.replace(/\.md$/, '');
	const raw = readFileSync(path.join(resourcesDir, file), 'utf-8');
	const { data } = parseFrontmatter(raw);

	if (data.ogImage) continue; // hand-made thumbnail already set, don't touch it

	const outPath = path.join(outDir, `${slug}.png`);
	const png = generateThumbnail(data.title || slug, data.genre || 'Resource', data.description || '', data.icon);
	writeFileSync(outPath, png);
	generated++;
}

console.log(`generate-thumbnails: wrote ${generated} fallback thumbnail(s) to public/images/generated/`);
