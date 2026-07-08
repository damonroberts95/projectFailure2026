// Pure-Node PDF writer + typesetter for resource scripts, styled to match the
// reference format: bold title, plain byline, bold "Name:" dialogue tags,
// italic stage directions, monospace body. Pure Node built-ins only (no pdf
// libraries) — same "hand-roll it" approach as thumbnail.mjs, and possible
// here because the standard 14 PDF fonts (Courier family) need no embedding.

const PAGE_W = 612; // US Letter, points
const PAGE_H = 792;
const MARGIN = 72; // 1 inch
const USABLE_W = PAGE_W - MARGIN * 2;

const TITLE_SIZE = 26;
const CREDITS_SIZE = 11;
const BODY_SIZE = 11;
const LINE_HEIGHT = 15;
const CHAR_WIDTH_FACTOR = 0.6; // Courier glyphs are exactly 600/1000 em wide

// content strings are only ever authored/edited by people with repo access, so a
// small manual map for the handful of typographic characters scripts actually use
// is enough — anything else falls back to '?' rather than corrupting the byte stream.
const WINANSI_MAP = {
	'–': 0x96, // –
	'—': 0x97, // —
	'‘': 0x91, // '
	'’': 0x92, // '
	'“': 0x93, // "
	'”': 0x94, // "
	'…': 0x85, // …
};

function toPdfBytes(text) {
	const bytes = [];
	for (const ch of text) {
		const code = ch.codePointAt(0);
		if (code < 128) bytes.push(code);
		else if (WINANSI_MAP[ch] !== undefined) bytes.push(WINANSI_MAP[ch]);
		else if (code <= 255) bytes.push(code);
		else bytes.push(0x3f); // '?'
	}
	return Buffer.from(bytes);
}

function escapePdfString(buf) {
	const out = [];
	for (const b of buf) {
		if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c);
		out.push(b);
	}
	return Buffer.from(out);
}

// --- markdown script parsing ---
// Convention (documented in README):
//   **Name:** dialogue text        -> dialogue, "Name:" rendered bold
//   *stage direction or action*    -> rendered italic
//   anything else                  -> plain paragraph
export function parseScriptBlocks(body) {
	return body
		.split(/\n\s*\n/)
		.map((b) => b.trim())
		.filter(Boolean)
		.map((block) => {
			let m = block.match(/^\*\*(.+?):\*\*\s*([\s\S]*)$/);
			if (m) return { type: 'dialogue', name: m[1].trim(), text: m[2].replace(/\s+/g, ' ').trim() };

			m = block.match(/^\*([\s\S]+)\*$/);
			if (m && !block.startsWith('**')) return { type: 'action', text: m[1].replace(/\s+/g, ' ').trim() };

			return { type: 'plain', text: block.replace(/\s+/g, ' ').trim() };
		});
}

function blockToTokens(block) {
	if (block.type === 'dialogue') {
		const words = block.text.length ? block.text.split(' ') : [];
		return [{ text: `${block.name}:`, style: 'bold' }, ...words.map((w) => ({ text: w, style: 'plain' }))];
	}
	const style = block.type === 'action' ? 'italic' : 'plain';
	return block.text.split(' ').map((w) => ({ text: w, style }));
}

function wrapTokens(tokens, maxChars) {
	const lines = [];
	let current = [];
	let currentLen = 0;
	for (const tok of tokens) {
		const sep = current.length ? 1 : 0;
		if (currentLen + sep + tok.text.length > maxChars && current.length > 0) {
			lines.push(current);
			current = [tok];
			currentLen = tok.text.length;
		} else {
			current.push(tok);
			currentLen += sep + tok.text.length;
		}
	}
	if (current.length) lines.push(current);
	return lines;
}

// groups a wrapped line's tokens into same-style runs, each with its own x offset
function lineToRuns(lineTokens, charWidth) {
	const runs = [];
	let x = 0;
	let i = 0;
	while (i < lineTokens.length) {
		const style = lineTokens[i].style;
		let text = lineTokens[i].text;
		let j = i + 1;
		while (j < lineTokens.length && lineTokens[j].style === style) {
			text += ' ' + lineTokens[j].text;
			j++;
		}
		runs.push({ style, text, x });
		x += text.length * charWidth;
		if (j < lineTokens.length) x += charWidth; // the (unrendered) separating space
		i = j;
	}
	return runs;
}

const FONT_TAG = { plain: 'F1', bold: 'F2', italic: 'F3' };

function buildContentStream(ops) {
	const parts = [];
	for (const op of ops) {
		parts.push(Buffer.from(`BT /${FONT_TAG[op.style]} ${op.size} Tf 1 0 0 1 ${op.x.toFixed(2)} ${op.y.toFixed(2)} Tm `, 'latin1'));
		parts.push(Buffer.from('(', 'latin1'));
		parts.push(escapePdfString(toPdfBytes(op.text)));
		parts.push(Buffer.from(') Tj ET\n', 'latin1'));
	}
	return Buffer.concat(parts);
}

function buildPdf(pagesOps) {
	const catalogNum = 1;
	const pagesNum = 2;
	const fRegular = 3;
	const fBold = 4;
	const fItalic = 5;

	const pageObjNums = [];
	const contentObjNums = [];
	let nextNum = 6;
	for (let i = 0; i < pagesOps.length; i++) {
		pageObjNums.push(nextNum++);
		contentObjNums.push(nextNum++);
	}

	const objStrings = new Array(nextNum);
	const contentBuffers = new Array(nextNum);

	objStrings[catalogNum] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`;
	objStrings[pagesNum] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pagesOps.length} >>`;
	objStrings[fRegular] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
	objStrings[fBold] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>';
	objStrings[fItalic] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Oblique /Encoding /WinAnsiEncoding >>';

	for (let i = 0; i < pagesOps.length; i++) {
		const pageNum = pageObjNums[i];
		const contentNum = contentObjNums[i];
		objStrings[pageNum] =
			`<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
			`/Resources << /Font << /F1 ${fRegular} 0 R /F2 ${fBold} 0 R /F3 ${fItalic} 0 R >> >> ` +
			`/Contents ${contentNum} 0 R >>`;
		contentBuffers[contentNum] = buildContentStream(pagesOps[i]);
	}

	const chunks = [];
	let offset = 0;
	const push = (buf) => {
		chunks.push(buf);
		offset += buf.length;
	};

	push(Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1'));

	const objOffsets = new Array(nextNum).fill(0);
	for (let n = 1; n < nextNum; n++) {
		objOffsets[n] = offset;
		if (contentBuffers[n]) {
			push(Buffer.from(`${n} 0 obj\n<< /Length ${contentBuffers[n].length} >>\nstream\n`, 'latin1'));
			push(contentBuffers[n]);
			push(Buffer.from('\nendstream\nendobj\n', 'latin1'));
		} else {
			push(Buffer.from(`${n} 0 obj\n${objStrings[n]}\nendobj\n`, 'latin1'));
		}
	}

	const xrefOffset = offset;
	let xref = `xref\n0 ${nextNum}\n0000000000 65535 f \n`;
	for (let n = 1; n < nextNum; n++) {
		xref += `${String(objOffsets[n]).padStart(10, '0')} 00000 n \n`;
	}
	push(Buffer.from(xref, 'latin1'));
	push(Buffer.from(`trailer\n<< /Size ${nextNum} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, 'latin1'));

	return Buffer.concat(chunks);
}

export function generateScriptPdf({ title, credits, body }) {
	const pagesOps = [];
	let ops = [];
	let y = PAGE_H - MARGIN;

	function newPage() {
		if (ops.length) pagesOps.push(ops);
		ops = [];
		y = PAGE_H - MARGIN;
	}

	function ensureRoom(needed = LINE_HEIGHT) {
		if (y - needed < MARGIN) newPage();
	}

	function emitLine(runs, size, style) {
		ensureRoom();
		for (const run of runs) {
			ops.push({ style: run.style ?? style, size, x: MARGIN + run.x, y, text: run.text });
		}
		y -= LINE_HEIGHT;
	}

	// title (wrapped, in case it's long)
	const titleCharWidth = TITLE_SIZE * CHAR_WIDTH_FACTOR;
	const titleMaxChars = Math.floor(USABLE_W / titleCharWidth);
	const titleTokens = title.split(' ').map((w) => ({ text: w, style: 'bold' }));
	for (const line of wrapTokens(titleTokens, titleMaxChars)) {
		emitLine(lineToRuns(line, titleCharWidth), TITLE_SIZE, 'bold');
	}
	y -= LINE_HEIGHT * 0.4;

	if (credits) {
		const creditsCharWidth = CREDITS_SIZE * CHAR_WIDTH_FACTOR;
		const creditsMaxChars = Math.floor(USABLE_W / creditsCharWidth);
		const creditsTokens = credits.split(' ').map((w) => ({ text: w, style: 'plain' }));
		for (const line of wrapTokens(creditsTokens, creditsMaxChars)) {
			emitLine(lineToRuns(line, creditsCharWidth), CREDITS_SIZE, 'plain');
		}
	}
	y -= LINE_HEIGHT; // blank line before the script proper

	const bodyCharWidth = BODY_SIZE * CHAR_WIDTH_FACTOR;
	const bodyMaxChars = Math.floor(USABLE_W / bodyCharWidth);
	const blocks = parseScriptBlocks(body);
	for (const block of blocks) {
		const tokens = blockToTokens(block);
		if (!tokens.length) continue;
		for (const line of wrapTokens(tokens, bodyMaxChars)) {
			emitLine(lineToRuns(line, bodyCharWidth), BODY_SIZE);
		}
		y -= LINE_HEIGHT; // blank line between blocks
	}

	if (ops.length) pagesOps.push(ops);
	if (pagesOps.length === 0) pagesOps.push([]);

	return buildPdf(pagesOps);
}
