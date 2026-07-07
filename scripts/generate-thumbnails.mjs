// Generates a generic on-brand thumbnail for any sketch that doesn't set its own
// `ogImage`. Sketches with a hand-made ogImage (e.g. the-isolator) are left
// untouched. Drawing logic lives in scripts/lib/thumbnail.mjs — see
// scripts/test-thumbnails.mjs for a per-icon visual test harness.

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateThumbnail } from './lib/thumbnail.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sketchesDir = path.join(root, 'src/content/sketches');
const outDir = path.join(root, 'public/images/generated');

// --- minimal frontmatter reader: only pulls the flat scalar keys we need ---
function parseFrontmatter(raw) {
	const match = raw.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const data = {};
	for (const line of match[1].split('\n')) {
		const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
		if (!m) continue;
		let value = m[2].trim();
		value = value.replace(/^["']|["']$/g, '');
		data[m[1]] = value;
	}
	return data;
}

mkdirSync(outDir, { recursive: true });

const files = readdirSync(sketchesDir).filter((f) => f.endsWith('.md'));
let generated = 0;

for (const file of files) {
	const slug = file.replace(/\.md$/, '');
	const raw = readFileSync(path.join(sketchesDir, file), 'utf-8');
	const data = parseFrontmatter(raw);

	if (data.ogImage) continue; // hand-made thumbnail already set, don't touch it

	const outPath = path.join(outDir, `${slug}.png`);
	const png = generateThumbnail(data.title || slug, data.genre || 'Sketch', data.description || '', data.icon);
	writeFileSync(outPath, png);
	generated++;
}

console.log(`generate-thumbnails: wrote ${generated} fallback thumbnail(s) to public/images/generated/`);
