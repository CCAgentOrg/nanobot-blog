import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
// import sitemap from '@astrojs/sitemap';

// Disable sitemap plugin due to compatibility issues
// Manual sitemap is generated in src/pages/sitemap.xml.ts

// https://astro.build/config
export default defineConfig({
  site: 'https://nanobot.srik.me',
  integrations: [mdx()],
});
