# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hexo blog powered by the Butterfly theme, deployed to GitHub Pages at https://kon-forever.cloud. The blog focuses on technical content in Chinese (Java, Spring Boot, MySQL, Redis, SSM framework).

## Common Commands

```bash
npm run server          # Start dev server (http://localhost:4000)
npm run build           # Generate static site to /public
npm run clean           # Clean generated files
npm run deploy          # Deploy to GitHub Pages
npm run format:posts    # Format markdown posts (removes Chinese chapter numbers from headings)
```

## Project Structure

- **`source/_posts/`** — Blog posts in Markdown with YAML front matter
- **`source/css/custom.css`** — Custom styles (images, embeds, figures)
- **`source/js/`** — Custom JavaScript (font switcher, etc.)
- **`source/img/`** — Images and assets (logos, covers, backgrounds)
- **`themes/butterfly/`** — Butterfly theme files (customized)
- **`_config.yml`** — Main Hexo configuration
- **`_config.butterfly.yml`** — Theme-specific configuration
- **`scripts/format-markdown-posts.cjs`** — Post formatting utility
- **`docs/文章撰写提示.md`** — Guidelines for writing posts (not published)

## Key Configuration

**Site metadata** (`_config.yml`):
- Title: "k-on-forever's Blog"
- Language: `zh-CN` (Chinese)
- Timezone: `Asia/Shanghai`
- Permalink format: `:year/:month/:day/:title/`
- Deployment: Git to `k-on-forever/k-on-forever.github.io` (main branch)

**Theme settings** (`_config.butterfly.yml`):
- Code block theme: `pale night`
- Navigation: fixed header with logo
- Default cover image: `/img/default_cover.jpg`
- Background: `/img/bg_pattern.jpg`

## Post Front Matter

Posts use this structure:

```yaml
---
title: Article Title
date: 2026-03-20 12:00:00
updated: 2026-03-20 12:00:00
description: One-line summary for SEO and theme preview
categories:
  - Category Name
tags:
  - tag1
  - tag2
cover: /img/cover.jpg
---
```

**Important**: The `description` field is critical for SEO and theme previews. Keep it to 1–2 sentences.

## Post Formatting Rules

- **Headings**: Use Markdown `##` / `###` for proper TOC generation; avoid fake headings like `(1)` or `①`
- **Code blocks**: Do not auto-format code indentation/line breaks; preserve as-is to avoid site-wide display issues
- **Images**: Write `![alt](url)` or `<img>` normally; styling is handled by `source/css/custom.css`
- **Figures with captions**: Use HTML `<figure>` / `<figcaption>` tags
- **Embeds**: Paste iframes directly; theme applies embed styling automatically

The `npm run format:posts` script removes Chinese chapter numbers (一、二、三…) from heading lines only; it does not touch code blocks or image syntax.

## Development Workflow

1. **Write/edit posts** in `source/_posts/` with proper front matter
2. **Run dev server**: `npm run server` to preview at `http://localhost:4000`
3. **Test locally**: Check post rendering, images, code blocks, and navigation
4. **Format posts** (optional): `npm run format:posts` to clean up heading numbering
5. **Build**: `npm run build` generates static files to `/public`
6. **Deploy**: `npm run deploy` pushes to GitHub Pages

## Image Management

- Store images in `source/img/`
- Reference in posts as `/img/filename.ext`
- Common images:
  - `logo.png` — site logo (nav bar)
  - `default_cover.jpg` — fallback post cover
  - `bg_index.jpg` — homepage banner
  - `bg_pattern.jpg` — site background
  - `avatar.jpg` — author avatar
  - `favicon.jpg` — browser tab icon

**Note**: Recent changes show image file extensions were standardized (e.g., `.png` → `.jpg`). Ensure references in config and posts match the actual file extensions.

## Theme Customization

- **Custom CSS**: `source/css/custom.css` — modify here for site-wide styling
- **Custom JS**: `source/js/font-switcher.js` — font selection functionality
- **Theme config**: `_config.butterfly.yml` — navigation, colors, code themes, social links

## Important Notes

- Posts are in **Chinese** — maintain language consistency
- The `docs/` directory is not published; use it for internal notes and guidelines
- Git deployment is configured; commits to this repo trigger automatic builds
- The theme directory contains a malformed folder name (`butterfly、` with special character) — avoid modifying it
- Image references must match actual file extensions; mismatches will break post rendering
