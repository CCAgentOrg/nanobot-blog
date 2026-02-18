# nanobot Blog - AGENTS.md

This document provides context for coding agents (OpenClaw, Claude Code, Cline, OpenCode) to effectively work on this project.

## Project Overview

**Type:** Astro blog on GitHub Pages
**Purpose:** Document experiments with nanobot AI assistant
**Repository:** CCAgentOrg/nanobot-blog (public)
**URL:** https://ccagentorg.github.io/nanobot-blog/

## Tech Stack

- **Framework:** Astro 4.x
- **Language:** TypeScript (strict mode)
- **Content:** Markdown in `src/content/blog/`
- **Styling:** Scoped CSS in Astro components and a global theme file in `src/styles/theme.css`
- **Deployment:** GitHub Pages via Actions

## Directory Structure

```
nanobot-blog/
├── src/
│   ├── components/      # Reusable Astro components
│   ├── content/
│   │   ├── blog/          # Blog posts (markdown)
│   │   └── config.ts      # Content collection schema
│   ├── layouts/
│   │   ├── Layout.astro   # Base layout
│   │   └── BlogPost.astro # Blog post layout
│   ├── pages/
│   │   ├── index.astro    # Home page
│   │   ├── about.astro    # About page
│   │   ├── blog/
│   │   │   ├── [slug].astro  # Dynamic blog post routes
│   │   │   └── index.astro   # Blog listing page
│   │   └── rss.xml.js     # RSS feed
│   ├── styles/
│   │   └── theme.css      # Global CSS theme file
├── public/
│   └── favicon.svg        # Site favicon
├── astro.config.mjs        # Astro configuration
├── tsconfig.json          # TypeScript config
└── package.json            # Dependencies
```

## Content Schema

Blog posts use frontmatter with the following fields:

```typescript
{
  title: string;        // Post title
  description: string;  // Brief description (shown in listings)
  publishDate: Date;    // Publication date (YYYY-MM-DD)
  draft: boolean;       // Set true while drafting, false to publish
}
```

## GitHub Pages Configuration

- **Site URL:** `https://ccagentorg.github.io/nanobot-blog/`
- **Base path:** `/nanobot-blog`
- **Build output:** `dist/` directory

## Workflow for Adding Blog Posts

1. Create new markdown file in `src/content/blog/`
2. Use frontmatter template (set `draft: true` initially)
3. Test locally: `npm run dev`
4. Create feature branch: `git checkout -b post/new-post-title`
5. Commit changes
6. Open PR to `main`
7. Discuss in PR comments
8. Update `draft: false` when approved
9. Merge

## Common Tasks

### Add a new blog post:
- Create `src/content/blog/my-post.md` with proper frontmatter
- Run `npm run dev` to preview
- Test at `http://localhost:4321/blog/my-post/`

### Update styling:
- Modify `<style>` blocks in `.astro` components for scoped styles.
- Modify `src/styles/theme.css` for global style changes.

### Change site configuration:
- Edit `astro.config.mjs` for site/base URLs
- Edit `src/content/config.ts` for schema changes

### Add dependencies:
- `npm install <package>` for runtime deps
- `npm install -D <package>` for dev deps

## Deployment

GitHub Actions automatically builds and deploys:
1. Triggered on push to `main`
2. Runs `npm install` and `npm run build`
3. Deploys `dist/` to GitHub Pages

## Testing

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Notes for AI Agents

- **Use TypeScript strict mode** — All code must pass type checking
- **Follow Astro patterns** — Use `.astro` components, not React components
- **Content is Markdown** — Blog posts are MDX-compatible
- **Styles are scoped** — Don't use global styles unless needed
- **All posts require PR** — Never push directly to main
