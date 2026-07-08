import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const resources = defineCollection({
	// leading underscore (e.g. _template.md) is skipped, use it for copy-paste templates
	loader: glob({ pattern: '**/[^_]*.md', base: './src/content/resources' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		draft: z.boolean().default(false),
		// shows locally (astro dev), hidden from production builds — for example/
		// throwaway content, see src/lib/publish.ts
		test: z.boolean().default(false),
		genre: z.string().default('Resource'),
		// true if this resource has a script to publish — auto-generates a PDF from
		// the body text (see scripts/generate-script-pdfs.mjs) unless pdfFile is set.
		// Not every resource is a script, so this defaults to false: no flag, no PDF,
		// no "Read the script" block on the page.
		script: z.boolean().default(false),
		// e.g. "Comedy sketch by A, B, and C. Edited by D." — shown as the byline
		// under the title on the resource page. Also becomes the byline on the
		// auto-generated script PDF, but is NOT used on a hand-made pdfFile (that
		// file's own byline, if any, wins) — set credits either way if you want it
		// on the page.
		credits: z.string().optional(),
		ogImage: z.string().optional(),
		// picks the auto-generated fallback thumbnail's icon; ignored if ogImage is set.
		// see README for the list of available names.
		icon: z.string().optional(),
		youtubeId: z.string().optional(),
		audioUrl: z.string().optional(),
		// path to a hand-made script PDF — implies script, no need to also set it
		pdfFile: z.string().optional(),
	}),
});

const community = defineCollection({
	// leading underscore (e.g. _template.md) is skipped, use it for copy-paste templates
	loader: glob({ pattern: '**/[^_]*.md', base: './src/content/community' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		draft: z.boolean().default(false),
		// shows locally (astro dev), hidden from production builds — for example/
		// throwaway content, see src/lib/publish.ts
		test: z.boolean().default(false),
	}),
});

export const collections = { resources, community };
