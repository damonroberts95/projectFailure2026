// Test harness for the thumbnail icon library: renders one deterministic
// preview per icon in ICON_LIBRARY, forced via the `icon` param (bypassing
// keyword matching), into scripts/.thumbnail-previews/ (gitignored, local only).
//
// Run after changing any icon in scripts/lib/thumbnail.mjs:
//   node scripts/test-thumbnails.mjs
// Then look at the PNGs — this project has no headless browser / image-diff
// tooling, so "the test" is a human looking at the output.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON_LIBRARY, generateThumbnail } from './lib/thumbnail.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '.thumbnail-previews');

mkdirSync(outDir, { recursive: true });

const iconNames = Object.keys(ICON_LIBRARY);
for (const name of iconNames) {
	const png = generateThumbnail(`${name} test`, name, '', name);
	writeFileSync(path.join(outDir, `${name}.png`), png);
}

console.log(`test-thumbnails: wrote ${iconNames.length} preview(s) to scripts/.thumbnail-previews/`);
console.log(iconNames.map((n) => `  - ${n}`).join('\n'));
