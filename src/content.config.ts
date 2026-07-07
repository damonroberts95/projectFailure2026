import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		draft: z.boolean().default(false),
		tags: z.array(z.string()).default([]),
		ogImage: z.string().optional(),
		// optional companion media for comic/podcast-style posts
		images: z.array(z.string()).optional(),
		audioUrl: z.string().optional(),
	}),
});

const sketches = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/sketches' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		draft: z.boolean().default(false),
		tags: z.array(z.string()).default([]),
		ogImage: z.string().optional(),
		youtubeId: z.string().optional(),
		audioUrl: z.string().optional(),
		script: reference('scripts').optional(),
	}),
});

const scripts = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/scripts' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		draft: z.boolean().default(false),
		tags: z.array(z.string()).default([]),
		ogImage: z.string().optional(),
		pdfFile: z.string().optional(),
		sketch: reference('sketches').optional(),
	}),
});

const resources = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/resources' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		draft: z.boolean().default(false),
		tags: z.array(z.string()).default([]),
		audience: z.enum(['educator', 'student', 'general']).default('general'),
		file: z.string(),
	}),
});

export const collections = { blog, sketches, scripts, resources };
