import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isPublished } from '../lib/publish';

export async function GET(context) {
	const resources = await getCollection('resources', ({ data }) => isPublished(data));

	const items = resources
		.map((resource) => ({
			title: resource.data.title,
			description: resource.data.description,
			pubDate: resource.data.pubDate,
			link: `/resources/${resource.id}/`,
		}))
		.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	return rss({
		title: 'Project Failure',
		description: 'Comedy resources educating people about science.',
		site: context.site,
		items,
	});
}
