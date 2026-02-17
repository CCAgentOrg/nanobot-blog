import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://nanobot.srik.me',
  integrations: [mdx(), sitemap()],
  build: {
    format: 'directory',
  },
});
