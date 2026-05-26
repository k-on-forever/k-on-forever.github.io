# AGENTS.md — Hexo Butterfly Blog

## Commands

```bash
npm install           # Always run first after clone — no lockfile committed
npm run server        # Dev server at http://localhost:4000
npm run build         # Generates static site to /public
npm run clean         # Must run before rebuild if theme config changed
npm run format:posts  # Strips Chinese chapter numbers (一、二、三) from heading lines only
```

`npm run deploy` requires `hexo-deployer-git` which is **not installed** — actual deployment uses GitHub Actions (`/.github/workflows/deploy.yml`). Do not run `npm run deploy`.

## Post Front Matter (Non-Negotiable)

Every post **must** have `description` — it drives SEO meta tags and theme previews. `cover` is required or the post shows no header image. Missing either will break the site's appearance.

```yaml
---
title: Title
date: 2026-03-20 12:00:00
updated: 2026-03-20 12:00:00
description: One-line summary (critical for SEO)
categories:
  - Category
tags:
  - tag1
cover: /img/cover.jpg
---
```

## Posts Are in Chinese

All posts are written in Chinese (`zh-CN`). Do not write content in English.

## Code Blocks — Do Not Reformat

`source/css/custom.css` has site-wide code block styling. Do not auto-format code indentation or line breaks inside markdown code fences — it will break rendering across the entire site.

## Image Management

- Store in `source/img/`, reference as `/img/filename.ext`
- File extensions were recently standardized (`.png` → `.jpg`) — verify references match actual files on disk
- Some posts reference CSDN external images — these may break if CDN policies change

## Theme Config

Two config files, both matter:
- `_config.yml` — Hexo core (site metadata, deploy, generators)
- `_config.butterfly.yml` — Theme (colors, layout, code blocks, navigation, CDN, widgets)

Custom styles go in `source/css/custom.css` (4000+ lines, heavily customized). Custom JS in `source/js/`.

## Gotchas

- **Malformed theme folder**: `themes/butterfly、/` exists alongside `themes/butterfly/`. The one with the Chinese comma is a stale duplicate — do not modify or delete it carelessly, but also do not use it.
- **No `hexo-deployer-git`**: `npm run deploy` will fail. Deployment is handled by GitHub Actions only.
- **Image extensions**: Posts reference `.jpg`/`.jpeg`/`.png` — always `ls` the actual file before adding new image references.
- **`format:posts` scope**: Only strips Chinese chapter numbers from heading lines. Does not touch code blocks, image syntax, or `(1)` / `①` style markers.
- **`docs/` is not published** — use for internal notes only.

## Recent Changes

### 2026-05-20: UI Enhancements
- Sidebar card tape: Different colors for different card types (author, announcement, recent, categories, tags, archives, series)
- Back-to-top button: Added reading progress ring using conic-gradient
- Navigation: Current page menu item highlight with .is-active class
- Article h2: Hover animation - gradient bar widens from 4px to 7px, added pink to gradient
