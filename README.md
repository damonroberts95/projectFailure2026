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

To unpublish a post, delete its file (same commit/push steps) or add `draft: true` to
its frontmatter to hide it without deleting the file.

**`draft: true`** hides a post everywhere, permanently, until you remove the flag.
**`test: true`** is different — it hides a post only from the *live* site. It still
shows up when running `npm run dev` locally. Use this for example/placeholder content
you want to keep around and preview, but never want a visitor to actually see.

## Adding or editing a sketch

Sketches live in `src/content/sketches/`, one Markdown file per sketch. Same file format as
above, with extra optional fields:

```md
---
title: "The Isolator"
pubDate: 2026-07-07
description: "One sentence summary"
genre: "Science Comedy"    # shown as a small tag on the sketch, defaults to "Sketch" if omitted
youtubeId: "dQw4w9WgXcQ"   # optional — YouTube video ID to embed
pdfFile: "/downloads/the-isolator-script.pdf"   # optional — link to a downloadable script PDF
ogImage: "/images/the-isolator-thumb.png"   # optional — thumbnail shown on the card and social shares
---

Sketch description / synopsis goes here.
```

PDFs go in `public/downloads/`; reference them with a path starting `/downloads/`.
Thumbnails go in `public/images/`; same rule.

Sketches also support `draft: true` and `test: true`, same meaning as for Wall of Fame
posts — see above.

### Automatic thumbnails

If you don't set `ogImage`, the site generates a fallback thumbnail automatically
(title + genre on a chalkboard, with an icon). It picks the icon by scanning the
title/description/genre for keywords — or you can force a specific one with an
`icon` field:

```md
icon: "lightning"
```

Available icon names: `flask` (default), `lightning`, `flame`, `atom`, `book`,
`kettle`, `lightbulb`, `speech-bubble`, `star`, `skull`, `magnet`, `microscope`,
`bug`.

`icon` is ignored if `ogImage` is set — a hand-made thumbnail always wins.

If you change an icon's drawing code (`scripts/lib/thumbnail.mjs`), run
`npm run test:thumbnails` — it renders one preview per icon (forced, bypassing
keyword matching) into `scripts/.thumbnail-previews/` (gitignored) so you can
check every icon at a glance instead of hand-writing throwaway sketch entries.

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
│   ├── components/       shared Astro components (SEO, share buttons, video embed, survey popup)
│   ├── layouts/          page shell (nav, footer, global styles)
│   └── pages/            routes: home, /sketches/, /wall-of-fame/
├── astro.config.mjs
└── wrangler.jsonc        Cloudflare Workers deploy config
```
