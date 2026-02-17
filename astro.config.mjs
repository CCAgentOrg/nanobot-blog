import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://ccagentorg.github.io/nanobot-blog/',
  base: '/nanobot-blog',
  integrations: [mdx()],
  build: {
    format: 'directory',
  },
});
