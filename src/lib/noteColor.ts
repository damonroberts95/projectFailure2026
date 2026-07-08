// Assigns each Wall of Fame post a stable pastel color and a stable fold-corner,
// derived from its slug so the list card and the detail page always agree
// without passing state between them.
const NOTE_COLORS = ['#fff6a8', '#ffd0d0', '#c9e8ff', '#d7f2c2', '#ffdca8'];
const CORNERS = ['br', 'bl', 'tr', 'tl'] as const;
// self-hosted handwriting fonts, see public/fonts/NOTICE.md — each post picks
// one stably so a given sticky note always renders in the same "handwriting"
const NOTE_FONTS = ["'Permanent Marker', cursive", "'Caveat', cursive", "'Kalam', cursive", "'Shadows Into Light', cursive", "'Gochi Hand', cursive"];

// FNV-1a — small inputs with a shared prefix (e.g. every post ID starts with
// the same date) still need to land in very different buckets, which a naive
// hash doesn't reliably give you.
function fnv1a(str: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

export function noteColor(id: string): string {
	return NOTE_COLORS[fnv1a(id) % NOTE_COLORS.length];
}

// uses a different slice of bits than noteColor so the two picks decorrelate
// instead of tracking each other
export function foldCorner(id: string): (typeof CORNERS)[number] {
	return CORNERS[(fnv1a(id) >>> 16) % CORNERS.length];
}

// yet another bit slice, so color/corner/font all decorrelate from each other
export function noteFont(id: string): string {
	return NOTE_FONTS[(fnv1a(id) >>> 8) % NOTE_FONTS.length];
}
