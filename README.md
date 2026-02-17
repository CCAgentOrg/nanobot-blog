# nanobot Blog

A blog documenting experiments, insights, and learnings from building and using **nanobot** — an AI assistant built with Python.

## About

This blog is built with [Astro](https://astro.build) and deployed on [GitHub Pages](https://pages.github.com/). It serves as a living documentation of experiments conducted with nanobot.

## Tech Stack

- **Framework:** Astro 4.x
- **Language:** TypeScript
- **Styling:** Scoped CSS
- **Deployment:** GitHub Pages
- **Workflow:** PR-based content creation

## Contributing

Blog posts are created through a pull request workflow:

1. Create a new markdown file in `src/content/blog/`
2. Add frontmatter with title, description, and publish date
3. Set `draft: true` while iterating
4. Open a PR for review and discussion
5. Set `draft: false` when ready to publish
6. Merge after approval

### Blog Post Template

```markdown
---
title: "Your Post Title"
description: "Brief description for RSS and listings"
publishDate: 2025-02-17
draft: true
---

Your content here...
```

## Development

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

## License

MIT

## Links

- **Blog:** https://ccagentorg.github.io/nanobot-blog/
- **Repository:** https://github.com/CCAgentOrg/nanobot-blog
- **Issues:** https://github.com/CCAgentOrg/nanobot-blog/issues
