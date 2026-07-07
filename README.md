# Project Failure

Source for [www.projectfailure.co.uk](https://www.projectfailure.co.uk) — comedy sketches
educating people about science. Built with [Astro](https://astro.build), deployed on
Cloudflare Workers via a GitHub-connected build (push to `main` deploys automatically).

## Adding a Wall of Fame post

Wall of Fame ("Wall of Shame") is the sticky-note wall of science-fail stories people submit
through the [Survey123 form](https://survey123.arcgis.com/share/796b4aba20994178b0a272d94f536577?portalUrl=https://ngexplore.maps.arcgis.com).
Publishing one is: pick a story you want to share, copy it into a file, commit, push.
Choosing to copy a submission over **is** the approval step — nothing else needed.

1. Open `src/content/community/_template.md`.
2. Copy it, and rename the copy — delete the leading underscore, e.g. `2026-07-07-jane-doe.md`.
   (Files starting with `_` are ignored by the site, so the template itself never gets published.)
3. Fill in the three fields at the top of the file, between the `---` lines:

   ```md
   ---
   title: "A short, punchy title for the story"
   pubDate: 2026-07-07
   description: "One sentence summary, shown in the list view"
   ---

   The full story goes here, as plain text or a few short paragraphs.
   ```

   - `title` — keep it short, this is what shows on the sticky note.
   - `pubDate` — today's date, format `YYYY-MM-DD`.
   - `description` — one sentence, shown under the title in the list.
   - Everything below the second `---` is the story text itself.

4. Save, then commit and push:

   ```sh
   git add src/content/community/2026-07-07-jane-doe.md
   git commit -m "Add community submission: Jane Doe"
   git push
   ```

   No local setup needed for this step — it can also be done directly on GitHub.com by
   creating the file in that folder through the web interface, if that's easier than using git
   on the command line.

5. The site rebuilds automatically within a couple of minutes of pushing. No further steps.

To unpublish a post, delete its file (same commit/push steps) or add `draft: true` as a
fourth field in its frontmatter to hide it without deleting the file.

## Adding or editing a sketch

Sketches live in `src/content/sketches/`, one Markdown file per sketch. Same file format as
above, with extra optional fields:

```md
---
title: "The Isolator"
pubDate: 2026-07-07
description: "One sentence summary"
youtubeId: "dQw4w9WgXcQ"   # optional — YouTube video ID to embed
pdfFile: "/downloads/the-isolator-script.pdf"   # optional — link to a downloadable script PDF
---

Sketch description / synopsis goes here.
```

PDFs go in `public/downloads/`; reference them with a path starting `/downloads/`.

## Local development

```sh
npm install
npm run dev       # local dev server at localhost:4321
npm run build     # production build to ./dist
```

## Project structure

```text
/
├── public/               static files (favicon, downloadable PDFs)
├── src/
│   ├── content/
│   │   ├── sketches/     one .md file per sketch
│   │   └── community/    one .md file per Wall of Fame post (+ _template.md)
│   ├── components/       shared Astro components (SEO, share buttons, video embed)
│   ├── layouts/          page shell (nav, footer, global styles)
│   └── pages/            routes: home, /sketches/, /wall-of-fame/
├── astro.config.mjs
└── wrangler.jsonc        Cloudflare Workers deploy config
```
