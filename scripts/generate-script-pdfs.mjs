// Generates a styled script PDF for any resource with `script: true` that
// doesn't set its own `pdfFile`. Resources with a hand-made pdfFile (e.g.
// the-isolator) are left untouched; resources without `script: true` are
// skipped entirely — not every resource has a script to publish. Typesetting
// lives in scripts/lib/script-pdf.mjs — see the "Adding or editing a resource"
// section of README.md for the markdown convention (**Name:** for dialogue,
// *asterisks* for stage directions).

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateScriptPdf } from './lib/script-pdf.mjs';
import { parseFrontmatter, listContentFiles } from './lib/frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const resourcesDir = path.join(root, 'src/content/resources');
const outDir = path.join(root, 'public/downloads/generated');

mkdirSync(outDir, { recursive: true });

const files = listContentFiles(resourcesDir);
let generated = 0;

for (const file of files) {
	const slug = file.replace(/\.md$/, '');
	const raw = readFileSync(path.join(resourcesDir, file), 'utf-8');
	const { data, body } = parseFrontmatter(raw);

	if (data.pdfFile) continue; // hand-made script PDF already set, don't touch it
	if (data.script?.toLowerCase() !== 'true') continue; // no script to publish for this one — YAML also accepts True/TRUE

	const pdf = generateScriptPdf({ title: data.title || slug, credits: data.credits, body });
	writeFileSync(path.join(outDir, `${slug}.pdf`), pdf);
	generated++;
}

console.log(`generate-script-pdfs: wrote ${generated} fallback script PDF(s) to public/downloads/generated/`);
