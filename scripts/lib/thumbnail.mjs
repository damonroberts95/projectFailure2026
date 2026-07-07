// Pure-drawing library behind the fallback thumbnail generator. Pure Node
// built-ins only (zlib) — no image libraries, no network calls. Shared by
// scripts/generate-thumbnails.mjs (real content) and scripts/test-thumbnails.mjs
// (one deterministic preview per icon, for visually checking icon changes).

import { deflateSync, crc32 } from 'node:zlib';

export const W = 1200;
export const H = 630;

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

function darken(color, amt) {
	return [Math.round(color[0] * (1 - amt)), Math.round(color[1] * (1 - amt)), Math.round(color[2] * (1 - amt)), color[3]];
}

function lighten(color, amt) {
	return [
		Math.round(color[0] + (255 - color[0]) * amt),
		Math.round(color[1] + (255 - color[1]) * amt),
		Math.round(color[2] + (255 - color[2]) * amt),
		color[3],
	];
}

function fillEllipse(pixels, cx, cy, rx, ry, color) {
	for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
		for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
			if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) setPx(pixels, x, y, color);
		}
	}
}

// gives a flat circle a bit of sphere-like depth: a darker base disc, a slightly
// smaller base-color disc offset toward the light, and a small bright highlight —
// three flat layers read as one shaded sphere at icon scale.
function fillCircleShaded(pixels, cx, cy, r, color, lightAngle = -2.4) {
	const lx = Math.cos(lightAngle);
	const ly = Math.sin(lightAngle);
	fillCircle(pixels, cx, cy, r, darken(color, 0.32));
	fillCircle(pixels, cx - lx * r * 0.12, cy - ly * r * 0.12, r * 0.9, color);
	fillCircle(pixels, cx - lx * r * 0.4, cy - ly * r * 0.4, r * 0.28, lighten(color, 0.55));
}

// draws a ring by filling a circle then punching a smaller circle out of its
// center with the board background color — used for handles/loops/rings
function ringPunch(pixels, cx, cy, rOuter, rInner, color) {
	fillCircle(pixels, cx, cy, rOuter, color);
	fillCircle(pixels, cx, cy, rInner, BOARD);
}

// thin rotated rectangle from (cx,cy) pointing at `angle` for `length`, `thickness` wide
function legPoly(cx, cy, angle, length, thickness) {
	const dx = Math.cos(angle);
	const dy = Math.sin(angle);
	const px = -dy * (thickness / 2);
	const py = dx * (thickness / 2);
	const x1 = cx + px;
	const y1 = cy + py;
	const x2 = cx - px;
	const y2 = cy - py;
	return [
		[x1, y1],
		[x2, y2],
		[x2 + dx * length, y2 + dy * length],
		[x1 + dx * length, y1 + dy * length],
	];
}

// even-odd scanline polygon fill — used by icons that aren't just rects/circles
function fillPolygon(pixels, points, color) {
	const ys = points.map((p) => p[1]);
	const minY = Math.floor(Math.min(...ys));
	const maxY = Math.ceil(Math.max(...ys));
	for (let y = minY; y <= maxY; y++) {
		const xs = [];
		for (let i = 0; i < points.length; i++) {
			const [x1, y1] = points[i];
			const [x2, y2] = points[(i + 1) % points.length];
			if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
				xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
			}
		}
		xs.sort((a, b) => a - b);
		for (let i = 0; i < xs.length; i += 2) {
			fillRect(pixels, Math.round(xs[i]), y, Math.round(xs[i + 1]), y + 1, color);
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

	// glass shine: a lightened streak down the left edge of the body
	for (let row = topY * scale; row < bottomY * scale; row++) {
		const t = (row / scale - topY) / (bottomY - topY);
		const left = neckLeft + (baseLeft - neckLeft) * t;
		const shineX = ox + Math.round(left * scale) + 2;
		fillRect(pixels, shineX, oy + row, shineX + Math.max(1, Math.round(scale * 0.35)), oy + row + 1, lighten(YELLOW, 0.35));
	}

	fillCircle(pixels, sx(24), sy(7), 1.4 * scale, RED);
	fillCircle(pixels, sx(27), sy(10), 0.9 * scale, RED);
	fillCircle(pixels, sx(26), sy(4), 0.7 * scale, RED);
}

function drawLightning(pixels, ox, oy, scale) {
	const sx = (v) => ox + v * scale;
	const sy = (v) => oy + v * scale;
	const bolt = [
		[19, 2],
		[11, 17],
		[16, 17],
		[9, 30],
		[24, 14],
		[17, 14],
		[22, 2],
	].map(([x, y]) => [sx(x), sy(y)]);
	fillPolygon(pixels, bolt, YELLOW);
	fillCircle(pixels, sx(28), sy(6), 1.2 * scale, RED);
	fillCircle(pixels, sx(4), sy(22), 0.8 * scale, RED);
}

function drawFlame(pixels, ox, oy, scale) {
	const sx = (v) => ox + v * scale;
	const sy = (v) => oy + v * scale;
	const outer = [
		[16, 2],
		[23, 14],
		[21, 22],
		[26, 30],
		[6, 30],
		[11, 22],
		[9, 14],
	].map(([x, y]) => [sx(x), sy(y)]);
	const inner = [
		[16, 14],
		[20, 20],
		[19, 25],
		[21, 30],
		[11, 30],
		[13, 25],
		[12, 20],
	].map(([x, y]) => [sx(x), sy(y)]);
	fillPolygon(pixels, outer, RED);
	fillPolygon(pixels, inner, YELLOW);
}

function drawAtom(pixels, ox, oy, scale) {
	const cx = ox + 16 * scale;
	const cy = oy + 16 * scale;
	fillCircleShaded(pixels, cx, cy, 3 * scale, WHITE);
	for (const angle of [0.5, -0.5, 1.6]) {
		for (let t = 0; t < Math.PI * 2; t += 0.15) {
			const ex = 13 * scale * Math.cos(t);
			const ey = 5 * scale * Math.sin(t);
			const rx = ex * Math.cos(angle) - ey * Math.sin(angle);
			const ry = ex * Math.sin(angle) + ey * Math.cos(angle);
			fillCircle(pixels, cx + rx, cy + ry, 0.6 * scale, YELLOW);
		}
	}
}

function drawBook(pixels, ox, oy, scale) {
	const sx = (v) => ox + Math.round(v * scale);
	const sy = (v) => oy + Math.round(v * scale);
	const srect = (x0, y0, x1, y1, color) => fillRect(pixels, sx(x0), sy(y0), sx(x1), sy(y1), color);

	srect(3, 9, 16, 27, OUTLINE);
	srect(4, 10, 15, 26, YELLOW);
	srect(17, 9, 30, 27, OUTLINE);
	srect(18, 10, 29, 26, YELLOW);
	srect(15, 8, 18, 28, OUTLINE);
	srect(6, 14, 13, 15, RED);
	srect(6, 18, 13, 19, RED);
	srect(20, 14, 27, 15, RED);
	srect(20, 18, 27, 19, RED);
}

// modeled on a classic vintage stovetop-kettle silhouette: wide tapering body,
// tall arched bail handle over the top, curved spout low on the side
function drawKettle(pixels, ox, oy, scale) {
	const sx = (v) => ox + v * scale;
	const sy = (v) => oy + v * scale;
	const srect = (x0, y0, x1, y1, color) =>
		fillRect(pixels, Math.round(sx(x0)), Math.round(sy(y0)), Math.round(sx(x1)), Math.round(sy(y1)), color);

	// bail handle: two struts rising from the shoulders to a horizontal grip bar
	// arching high above the lid — the defining "kettle" silhouette, not a mug ring
	fillPolygon(pixels, legPoly(sx(10.5), sy(17), -1.85, 15.5 * scale, 2.2 * scale), OUTLINE);
	fillPolygon(pixels, legPoly(sx(21.5), sy(17), -1.29, 15.5 * scale, 2.2 * scale), OUTLINE);
	srect(11.5, 1.5, 20.5, 4.5, OUTLINE);

	// body: wide flat base tapering up to a narrower shoulder
	const baseLeft = 6,
		baseRight = 26,
		shoulderLeft = 11,
		shoulderRight = 21,
		topY = 17,
		bottomY = 30;
	for (let row = topY * scale; row < bottomY * scale; row++) {
		const t = (row / scale - topY) / (bottomY - topY);
		const left = shoulderLeft + (baseLeft - shoulderLeft) * t;
		const right = shoulderRight + (baseRight - shoulderRight) * t;
		fillRect(pixels, Math.round(ox + left * scale) - 2, oy + row, Math.round(ox + right * scale) + 2, oy + row + 1, OUTLINE);
		fillRect(pixels, Math.round(ox + left * scale), oy + row, Math.round(ox + right * scale), oy + row + 1, YELLOW);
	}
	// glass-shine streak, same trick as the flask
	for (let row = topY * scale; row < bottomY * scale; row++) {
		const t = (row / scale - topY) / (bottomY - topY);
		const left = shoulderLeft + (baseLeft - shoulderLeft) * t;
		const shineX = Math.round(ox + left * scale) + 2;
		fillRect(pixels, shineX, oy + row, shineX + Math.max(1, Math.round(scale * 0.3)), oy + row + 1, lighten(YELLOW, 0.35));
	}

	// domed lid + band line + knob
	srect(12.5, 13, 19.5, 17.4, OUTLINE);
	srect(13.3, 13.6, 18.7, 16.6, YELLOW);
	srect(12.5, 15.6, 19.5, 16.3, OUTLINE);
	fillCircle(pixels, sx(16), sy(11.5), 1.7 * scale, OUTLINE);

	// spout: tapering tube of densely-overlapping circles along a bezier curve
	// (consecutive samples closer together than the radius, so they melt into
	// one smooth cone instead of reading as a string of beads), low on the left
	const p0 = [8, 25.5];
	const p1 = [1, 22];
	const p2 = [-2, 15.5];
	const steps = 32;
	const spoutPoints = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const mt = 1 - t;
		const x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0];
		const y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1];
		const r = 3 + (0.6 - 3) * t;
		spoutPoints.push({ x, y, r });
	}
	for (const p of spoutPoints) fillCircle(pixels, sx(p.x), sy(p.y), (p.r + 0.6) * scale, OUTLINE);
	for (const p of spoutPoints) fillCircle(pixels, sx(p.x), sy(p.y), p.r * scale, YELLOW);
}

function drawLightbulb(pixels, ox, oy, scale) {
	const sx = (v) => ox + Math.round(v * scale);
	const sy = (v) => oy + Math.round(v * scale);
	const srect = (x0, y0, x1, y1, color) => fillRect(pixels, sx(x0), sy(y0), sx(x1), sy(y1), color);

	fillCircle(pixels, sx(16), sy(13), 11 * scale, OUTLINE);
	fillCircleShaded(pixels, sx(16), sy(13), 9.5 * scale, YELLOW);
	srect(12, 22, 20, 26, OUTLINE);
	srect(13, 26, 19, 29, OUTLINE);
	srect(13, 23, 19, 24, RED);
	srect(13, 25, 19, 26, RED);
}

function drawSpeechBubble(pixels, ox, oy, scale) {
	const sx = (v) => ox + Math.round(v * scale);
	const sy = (v) => oy + Math.round(v * scale);
	const srect = (x0, y0, x1, y1, color) => fillRect(pixels, sx(x0), sy(y0), sx(x1), sy(y1), color);

	srect(3, 5, 29, 23, OUTLINE);
	srect(4, 6, 28, 22, YELLOW);
	fillPolygon(
		pixels,
		[
			[10, 22],
			[6, 30],
			[16, 22],
		].map(([x, y]) => [sx(x), sy(y)]),
		YELLOW,
	);
	srect(7, 10, 24, 12, RED);
	srect(7, 15, 19, 17, RED);
}

function drawStar(pixels, ox, oy, scale) {
	const cx = ox + 16 * scale;
	const cy = oy + 17 * scale;
	const outerR = 15 * scale;
	const innerR = 6.2 * scale;
	const points = [];
	for (let i = 0; i < 10; i++) {
		const r = i % 2 === 0 ? outerR : innerR;
		const angle = (-90 + i * 36) * (Math.PI / 180);
		points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
	}
	fillPolygon(pixels, points, YELLOW);
}

function drawSkull(pixels, ox, oy, scale) {
	const sx = (v) => ox + Math.round(v * scale);
	const sy = (v) => oy + Math.round(v * scale);
	const srect = (x0, y0, x1, y1, color) => fillRect(pixels, sx(x0), sy(y0), sx(x1), sy(y1), color);

	fillCircle(pixels, sx(16), sy(13), 11 * scale, OUTLINE);
	fillCircleShaded(pixels, sx(16), sy(13), 9.5 * scale, WHITE);
	srect(9, 18, 23, 27, OUTLINE);
	srect(10, 18, 22, 25, WHITE);
	fillCircle(pixels, sx(12), sy(12), 2.6 * scale, OUTLINE);
	fillCircle(pixels, sx(20), sy(12), 2.6 * scale, OUTLINE);
	srect(13, 25, 15, 27, OUTLINE);
	srect(17, 25, 19, 27, OUTLINE);
}

function drawMagnet(pixels, ox, oy, scale) {
	const sx = (v) => ox + Math.round(v * scale);
	const sy = (v) => oy + Math.round(v * scale);
	const srect = (x0, y0, x1, y1, color) => fillRect(pixels, sx(x0), sy(y0), sx(x1), sy(y1), color);

	ringPunch(pixels, sx(16), sy(14), 11 * scale, 6 * scale, RED);
	srect(5, 14, 12, 30, RED);
	srect(20, 14, 27, 30, RED);
	srect(5, 25, 12, 30, WHITE);
	srect(20, 25, 27, 30, WHITE);
}

function drawMicroscope(pixels, ox, oy, scale) {
	const sx = (v) => ox + Math.round(v * scale);
	const sy = (v) => oy + Math.round(v * scale);
	const srect = (x0, y0, x1, y1, color) => fillRect(pixels, sx(x0), sy(y0), sx(x1), sy(y1), color);

	srect(6, 29, 26, 31, OUTLINE);
	srect(14, 27, 18, 29, OUTLINE);
	srect(13, 11, 19, 27, OUTLINE);
	srect(14, 12, 18, 26, YELLOW);
	srect(8, 19, 24, 21, OUTLINE);
	srect(12, 5, 20, 11, OUTLINE);
	srect(13, 6, 19, 10, YELLOW);
}

function drawBug(pixels, ox, oy, scale) {
	const sx = (v) => ox + v * scale;
	const sy = (v) => oy + v * scale;

	const legAttachY = [16, 20, 24];
	for (const side of [-1, 1]) {
		for (let i = 0; i < 3; i++) {
			const attachX = 16 + side * 7;
			const angle = side === 1 ? 0.2 + i * 0.45 : Math.PI - 0.2 - i * 0.45;
			const poly = legPoly(sx(attachX), sy(legAttachY[i]), angle, 9 * scale, 1.6 * scale);
			fillPolygon(pixels, poly, OUTLINE);
		}
	}
	for (const side of [-1, 1]) {
		const angle = side === 1 ? -1.0 : Math.PI + 1.0;
		const poly = legPoly(sx(16 + side * 2), sy(5), angle, 7 * scale, 1.2 * scale);
		fillPolygon(pixels, poly, OUTLINE);
		fillCircle(pixels, poly[2][0], poly[2][1], 1 * scale, OUTLINE);
	}

	fillCircle(pixels, sx(16), sy(20), 8.5 * scale, OUTLINE);
	fillCircleShaded(pixels, sx(16), sy(20), 7.5 * scale, GREEN);
	fillCircle(pixels, sx(16), sy(9), 5 * scale, OUTLINE);
	fillCircleShaded(pixels, sx(16), sy(9), 4.2 * scale, GREEN);
	fillRect(pixels, sx(16) - Math.round(0.5 * scale), sy(15), sx(16) + Math.round(0.5 * scale), sy(24), OUTLINE);
}

// local "icon library" — pick the most relevant hand-drawn icon for the sketch's
// content instead of always defaulting to the flask. No external icon set: keeps
// the same zero-dependency pixel-art technique as the rest of this script.
export const ICON_LIBRARY = {
	flask: drawFlask,
	lightning: drawLightning,
	flame: drawFlame,
	atom: drawAtom,
	book: drawBook,
	kettle: drawKettle,
	lightbulb: drawLightbulb,
	'speech-bubble': drawSpeechBubble,
	star: drawStar,
	skull: drawSkull,
	magnet: drawMagnet,
	microscope: drawMicroscope,
	bug: drawBug,
};

const KEYWORD_ICONS = [
	{ test: /fire|flame|burn|combust/, name: 'flame' },
	{ test: /static|electric|spark|lightning|cling|shock/, name: 'lightning' },
	{ test: /atom|physics|quantum|particle|gravity/, name: 'atom' },
	{ test: /history|ancient|century|era|historical/, name: 'book' },
	{ test: /kettle|tea|cook|kitchen/, name: 'kettle' },
	{ test: /idea|eureka|invent/, name: 'lightbulb' },
	{ test: /comedy|joke|dialogue|argument/, name: 'speech-bubble' },
	{ test: /award|magic|wonder|wish/, name: 'star' },
	{ test: /toxic|poison|danger|death/, name: 'skull' },
	{ test: /magnet|attract|repel/, name: 'magnet' },
	{ test: /microscope|biology|cell|bacteria/, name: 'microscope' },
	{ test: /\bbug\b|insect|mistake|glitch/, name: 'bug' },
];

// explicit `icon:` frontmatter wins if it names a real icon; otherwise fall back
// to keyword matching against title/description/genre; otherwise the flask.
function pickIcon(title, description, genre, explicitIcon) {
	if (explicitIcon && ICON_LIBRARY[explicitIcon]) return ICON_LIBRARY[explicitIcon];
	const text = `${title} ${description} ${genre}`.toLowerCase();
	const match = KEYWORD_ICONS.find((icon) => icon.test.test(text));
	return match ? ICON_LIBRARY[match.name] : drawFlask;
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

export function generateThumbnail(title, genre, description, icon) {
	const pixels = makeCanvas();

	const FRAME_W = 20;
	fillRect(pixels, 0, 0, W, FRAME_W, FRAME);
	fillRect(pixels, 0, H - FRAME_W, W, H, FRAME);
	fillRect(pixels, 0, 0, FRAME_W, H, FRAME);
	fillRect(pixels, W - FRAME_W, 0, W, H, FRAME);

	fillEllipse(pixels, 90 + 16 * 11, 200 + 33 * 11, 15 * 11, 3.2 * 11, darken(BOARD, 0.55));
	pickIcon(title, description, genre, icon)(pixels, 90, 200, 11);

	const textX = 460;
	const titleScale = Math.min(9, Math.max(2, Math.floor((W - textX - 60) / textWidth(title, 1, 2))));
	const genreScale = Math.min(titleScale - 1, Math.max(2, titleScale - 3));
	drawText(pixels, title, textX, 260, titleScale, WHITE, 2);
	drawText(pixels, genre.toUpperCase(), textX, 260 + (7 * titleScale + 30), genreScale, YELLOW, 2);

	return encodePNG(pixels, W, H);
}
