import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
	const posts = await getCollection('blog', ({ data }) => !data.draft);
	const sketches = await getCollection('sketches', ({ data }) => !data.draft);

	const items = [
		...posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `/blog/${post.id}/`,
		})),
		...sketches.map((sketch) => ({
			title: sketch.data.title,
			description: sketch.data.description,
			pubDate: sketch.data.pubDate,
			link: `/sketches/${sketch.id}/`,
		})),
	].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	return rss({
		title: 'Project Failure',
		description: 'Comedy sketches educating people about science.',
		site: context.site,
		items,
	});
}
