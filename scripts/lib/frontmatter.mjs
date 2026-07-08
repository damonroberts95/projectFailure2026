// Minimal frontmatter reader shared by the build-time generators (thumbnails,
// script PDFs) — only pulls the flat scalar keys they need. Not a full YAML
// parser: arrays/nested objects aren't supported, only `key: value` lines.
import { readdirSync } from 'node:fs';

function parseValue(raw) {
	const value = raw.trim();

	// quoted value: take exactly what's between the matching quotes, so a
	// trailing " # comment" (as shown in README's own frontmatter examples)
	// doesn't get swallowed into the value
	const quoted = value.match(/^"([^"]*)"/) ?? value.match(/^'([^']*)'/);
	if (quoted) return quoted[1];

	// unquoted: strip a trailing " # comment" (YAML comments need a preceding space)
	const hashIndex = value.search(/\s#/);
	return hashIndex === -1 ? value : value.slice(0, hashIndex).trim();
}

export function parseFrontmatter(raw) {
	const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) return { data: {}, body: raw };
	const data = {};
	for (const line of match[1].split('\n')) {
		const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
		if (!m) continue;
		data[m[1]] = parseValue(m[2]);
	}
	return { data, body: match[2] };
}

// leading underscore (e.g. _template.md) is a copy-paste template, not real
// content — mirrors the `**/[^_]*.md` glob pattern content.config.ts's Astro
// loader uses (a different API, so can't literally share the one predicate)
export function listContentFiles(dir) {
	return readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
}
