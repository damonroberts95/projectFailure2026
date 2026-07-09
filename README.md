# Project Failure

Source for [www.projectfailure.co.uk](https://www.projectfailure.co.uk) — comedy resources
educating people about science. Built with [Astro](https://astro.build), deployed on
Cloudflare Workers via a GitHub-connected build (push to `main` deploys automatically).

## Adding a Wall of Fame post

Wall of Fame ("Wall of Shame") is the sticky-note wall of science-fail stories people submit
through the an embedded Survey123 Form. 
Publishing one manual: pick a story you want to share, copy it into a file, commit, push.

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
its header to hide it without deleting the file.

**`draft: true`** hides a post everywhere, permanently, until you remove the flag.
**`test: true`** is different — it hides a post only from the *live* site. It still
shows up when running `npm run dev` locally. Use this for example/placeholder content
you want to keep around and preview, but never want a visitor to actually see.

## Adding or editing a resource

Resources are the sketches/videos/discussions page — one file per resource in
`src/content/resources/`. Same process as a Wall of Fame post:

1. Open `src/content/resources/_template.md`.
2. Copy it, and rename the copy — delete the leading underscore, e.g. `the-isolator.md`.
3. Fill in the fields. Every field is explained by a comment right above it in the
   template — delete any you don't need. Only `title`, `pubDate`, and `description` are
   required; everything else is optional.
4. Save, then commit and push (same as a Wall of Fame post — see step 4 above, or edit the
   file directly on GitHub.com).

A filled-in example:

```md
---
title: "The Isolator"
pubDate: 2026-07-07
description: "One sentence summary"
genre: "Science Comedy"    # small tag shown on the card, defaults to "Resource" if omitted
---

Resource description / synopsis goes here.
```

Resources also support `draft: true` and `test: true`, same meaning as for Wall of Fame
posts — see above.

### Got a script to publish?

Set `script: true` and write the script itself as the body of the file, using this style:

```md
**Hu:** Please put the experiment down very carefully.

*Al lifts a comically large petri dish from the table, staring at it in curiosity.*

Two scientists are stood at a white-topped table.
```

- `**Name:**` at the start of a paragraph — that's a line of dialogue; the name renders bold.
- A paragraph wrapped entirely in `*asterisks*` — a stage direction or action; renders italic.
- Anything else — plain text (scene-setting, narration).

The site turns this into a nicely formatted, downloadable PDF automatically — no need to
format a script separately. Leave `script: false` (the default) for resources that aren't
scripts; nothing extra happens. If you already have a script PDF made elsewhere, set
`pdfFile` to its path instead (see the template) and skip `script` — that file is used as-is.
Set `credits` too if you want a byline (writers, editor) under the title.

### Thumbnails

If you don't set `ogImage`, a thumbnail is generated automatically — title and genre on a
little chalkboard, with a small icon. Pick a specific icon with the `icon` field:

```md
icon: "lightning"
```

Available icons: `flask` (default), `lightning`, `flame`, `atom`, `book`,
`kettle`, `lightbulb`, `speech-bubble`, `star`, `skull`, `magnet`, `microscope`,
`bug`. Ignored if `ogImage` is set — a hand-made thumbnail always wins.

## Local development

```sh
npm install
npm run dev       # local dev server at localhost:4321
npm run build     # production build to ./dist
```

`npm run dev`/`npm run build` also regenerate thumbnails and script PDFs automatically
(via the `predev`/`prebuild` hooks in package.json). If you start the dev server a
different way (e.g. `astro dev` directly, bypassing npm), run those generators yourself
first: `node scripts/generate-thumbnails.mjs && node scripts/generate-script-pdfs.mjs`.

Changed an icon's drawing code in `scripts/lib/thumbnail.mjs`? Run `npm run test:thumbnails`
to render one preview per icon into `scripts/.thumbnail-previews/` (gitignored) so you can
check every icon at a glance.

## Project structure

```text
/
├── public/               static files (favicon, downloadable PDFs)
├── src/
│   ├── content/
│   │   ├── resources/    one .md file per resource (+ _template.md)
│   │   └── community/    one .md file per Wall of Fame post (+ _template.md)
│   ├── components/       shared Astro components (SEO, share buttons, video embed, survey popup)
│   ├── layouts/          page shell (nav, footer, global styles)
│   └── pages/            routes: home, /resources/, /wall-of-fame/
├── scripts/              build-time generators (thumbnails, script PDFs) — see lib/ for the drawing/typesetting code
├── astro.config.mjs
└── wrangler.jsonc        Cloudflare Workers deploy config
```
