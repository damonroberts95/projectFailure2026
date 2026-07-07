// Generates a generic on-brand thumbnail for any sketch that doesn't set its own
// `ogImage`. Pure Node built-ins only (fs, path, zlib) — no image libraries, no
// network calls, so this runs the same in local dev, CI, and Cloudflare's build.
// Sketches with a hand-made ogImage (e.g. the-isolator) are left untouched.

import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sketchesDir = path.join(root, 'src/content/sketches');
const outDir = path.join(root, 'public/images/generated');

const W = 1200;
const H = 630;

function hexColor(hex) {
	hex = hex.replace('#', '');
	return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
}

const BOARD = hexColor('1e3a2b');
const FRAME = hexColor('6b4a30');
const YELLOW = hexColor('ffce45');
const GREEN = hexColor('3fae76');
const RED = hexColor('ff6b6b');
const WHITE = [255, 255, 255, 255];
const OUTLINE = hexColor('1a1a1a');

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

function makeCanvas() {
	const pixels = new Array(H);
	for (let y = 0; y < H; y++) pixels[y] = new Array(W).fill(BOARD);
	return pixels;
}

function setPx(pixels, x, y, color) {
	if (x >= 0 && x < W && y >= 0 && y < H) pixels[y][x] = color;
}

function fillRect(pixels, x0, y0, x1, y1, color) {
	x0 = Math.max(0, x0);
	x1 = Math.min(W, x1);
	y0 = Math.max(0, y0);
	y1 = Math.min(H, y1);
	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) pixels[y][x] = color;
	}
}

function fillCircle(pixels, cx, cy, r, color) {
	for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
		for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
			if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) setPx(pixels, x, y, color);
		}
	}
}

function drawFlask(pixels, ox, oy, scale) {
	const sx = (v) => ox + Math.round(v * scale);
	const sy = (v) => oy + Math.round(v * scale);
	const srect = (x0, y0, x1, y1, color) => fillRect(pixels, sx(x0), sy(y0), sx(x1), sy(y1), color);

	srect(12, 2, 20, 4, OUTLINE);
	srect(12, 4, 20, 12, OUTLINE);
	srect(13, 4, 19, 12, YELLOW);

	const neckLeft = 13,
		neckRight = 19,
		baseLeft = 7,
		baseRight = 25,
		topY = 12,
		bottomY = 27;

	for (let row = topY * scale; row < bottomY * scale; row++) {
		const t = (row / scale - topY) / (bottomY - topY);
		const left = neckLeft + (baseLeft - neckLeft) * t;
		const right = neckRight + (baseRight - neckRight) * t;
		fillRect(pixels, ox + Math.round(left * scale) - 2, oy + row, ox + Math.round(right * scale) + 2, oy + row + 1, OUTLINE);
		fillRect(pixels, ox + Math.round(left * scale), oy + row, ox + Math.round(right * scale), oy + row + 1, YELLOW);
	}

	const liquidTopY = 21;
	for (let row = liquidTopY * scale; row < bottomY * scale; row++) {
		const t = (row / scale - topY) / (bottomY - topY);
		const left = neckLeft + (baseLeft - neckLeft) * t;
		const right = neckRight + (baseRight - neckRight) * t;
		fillRect(pixels, ox + Math.round(left * scale), oy + row, ox + Math.round(right * scale), oy + row + 1, GREEN);
	}

	fillCircle(pixels, sx(24), sy(7), 1.4 * scale, RED);
	fillCircle(pixels, sx(27), sy(10), 0.9 * scale, RED);
	fillCircle(pixels, sx(26), sy(4), 0.7 * scale, RED);
}

// tiny 5x7 pixel font, uppercase + space only — enough for titles/genre tags
const FONT = {
	A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
	B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
	C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
	D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
	E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
	F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
	G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.####'],
	H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
	I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
	J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
	K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
	L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
	M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
	N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
	O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
	P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
	Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
	R: ['####.', '#...#', '#...#', '####.', '#..#.', '#...#', '#...#'],
	S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
	T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
	U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
	V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
	W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
	X: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '.#.#.', '#...#'],
	Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..', '..#..'],
	Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
	' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

function drawText(pixels, text, x, y, scale, color, spacing = 1) {
	let cursor = x;
	for (const ch of text.toUpperCase()) {
		const glyph = FONT[ch];
		if (!glyph) {
			cursor += (5 + spacing) * scale;
			continue;
		}
		for (let row = 0; row < glyph.length; row++) {
			for (let col = 0; col < glyph[row].length; col++) {
				if (glyph[row][col] === '#') {
					fillRect(pixels, cursor + col * scale, y + row * scale, cursor + col * scale + scale, y + row * scale + scale, color);
				}
			}
		}
		cursor += (5 + spacing) * scale;
	}
	return cursor;
}

function textWidth(text, scale, spacing = 1) {
	return text.length * (5 + spacing) * scale;
}

function encodePNG(pixels, w, h) {
	const rowBytes = 1 + w * 4;
	const raw = Buffer.alloc(rowBytes * h);
	for (let y = 0; y < h; y++) {
		raw[y * rowBytes] = 0;
		for (let x = 0; x < w; x++) {
			const [r, g, b, a] = pixels[y][x];
			const off = y * rowBytes + 1 + x * 4;
			raw[off] = r;
			raw[off + 1] = g;
			raw[off + 2] = b;
			raw[off + 3] = a;
		}
	}

	function chunk(tag, data) {
		const tagBuf = Buffer.from(tag, 'ascii');
		const body = Buffer.concat([tagBuf, data]);
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length, 0);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(body) >>> 0, 0);
		return Buffer.concat([len, body, crc]);
	}

	const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // color type RGBA
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;
	const idat = deflateSync(raw, { level: 9 });

	return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function generateThumbnail(title, genre) {
	const pixels = makeCanvas();

	const FRAME_W = 20;
	fillRect(pixels, 0, 0, W, FRAME_W, FRAME);
	fillRect(pixels, 0, H - FRAME_W, W, H, FRAME);
	fillRect(pixels, 0, 0, FRAME_W, H, FRAME);
	fillRect(pixels, W - FRAME_W, 0, W, H, FRAME);

	drawFlask(pixels, 90, 200, 11);

	const textX = 460;
	const titleScale = Math.min(9, Math.max(2, Math.floor((W - textX - 60) / textWidth(title, 1, 2))));
	const genreScale = Math.min(titleScale - 1, Math.max(2, titleScale - 3));
	drawText(pixels, title, textX, 260, titleScale, WHITE, 2);
	drawText(pixels, genre.toUpperCase(), textX, 260 + (7 * titleScale + 30), genreScale, YELLOW, 2);

	return encodePNG(pixels, W, H);
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
	const png = generateThumbnail(data.title || slug, data.genre || 'Sketch');
	writeFileSync(outPath, png);
	generated++;
}

console.log(`generate-thumbnails: wrote ${generated} fallback thumbnail(s) to public/images/generated/`);
