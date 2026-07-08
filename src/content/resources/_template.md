<!--
Copy this file, rename it (delete the leading underscore, e.g. the-isolator.md),
fill in the fields below, commit, push. Delete this comment block before
committing. See README.md, "Adding or editing a resource" / "Thumbnails" /
"Got a script to publish?" for full details on each field.

Optional fields below are commented out (start with #) — uncomment a line and
fill it in only if you're using it. Leaving a field as an empty "" instead of
deleting/commenting it is NOT the same as omitting it, and will break the
fallback it's supposed to have (e.g. an empty ogImage shows a broken image
instead of the auto-generated thumbnail) — so when in doubt, delete the line.
-->
---
title: ""
pubDate: 2026-01-01
description: ""

# false hides the post everywhere, permanently, until removed
draft: false
# true hides the post from the live site only — still shows in `npm run dev`.
# use for example/placeholder content you want to preview but never publish.
test: false

# small tag shown on the card and detail page. Uncomment to override —
# otherwise defaults to "Resource".
# genre: ""

# true if this resource has a script to publish — shows a "Read the script"
# block on the page. Leave false for resources with no script (most won't have
# one). If true and pdfFile isn't set below, a PDF is auto-generated from the
# body text (see README for the **Name:**/*italic* convention).
script: false
# byline shown under the title on the page, e.g.
# "Comedy sketch by A, B, and C. Edited by D." — also used on the
# auto-generated script PDF (not on a hand-made pdfFile's own byline, if any).
# credits: ""

# optional — YouTube video ID to embed (the part after ?v= in the URL)
# youtubeId: ""
# optional — path to an audio file under public/, starting with /
# audioUrl: ""
# optional — path to a hand-made script PDF under public/downloads/, starting
# with /downloads/. Implies script, no need to also set that.
# pdfFile: ""

# optional — thumbnail shown on the card and social shares, path under public/
# images/, starting with /images/. Uncomment to use a hand-made one —
# otherwise one is auto-generated from the title/genre/description/icon.
# ogImage: ""
# picks the auto-generated fallback thumbnail's icon; ignored if ogImage is set.
# one of: flask (default), lightning, flame, atom, book, kettle, lightbulb,
# speech-bubble, star, skull, magnet, microscope, bug
# icon: ""
---

Description / synopsis, or the full script if you want an auto-generated PDF.
