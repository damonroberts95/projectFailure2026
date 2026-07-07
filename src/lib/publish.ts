// `draft` hides an entry everywhere, always (not ready to publish).
// `test` hides an entry only from production builds — it still shows up when
// running `astro dev` locally, so example/throwaway content can live in the
// repo for previewing without ever reaching the live site.
export function isPublished(data: { draft?: boolean; test?: boolean }): boolean {
	if (data.draft) return false;
	if (data.test && import.meta.env.PROD) return false;
	return true;
}
