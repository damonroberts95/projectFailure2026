import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
	const sketches = await getCollection('sketches', ({ data }) => !data.draft);

	const items = sketches
		.map((sketch) => ({
			title: sketch.data.title,
			description: sketch.data.description,
			pubDate: sketch.data.pubDate,
			link: `/sketches/${sketch.id}/`,
		}))
		.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	return rss({
		title: 'Project Failure',
		description: 'Comedy sketches educating people about science.',
		site: context.site,
		items,
	});
}
