import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const sketches = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/sketches' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		draft: z.boolean().default(false),
		genre: z.string().default('Sketch'),
		tags: z.array(z.string()).default([]),
		ogImage: z.string().optional(),
		youtubeId: z.string().optional(),
		audioUrl: z.string().optional(),
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
	}),
});

export const collections = { sketches, community };
