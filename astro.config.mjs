import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Disable sitemap for PR builds to avoid errors
const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request';

const integrations = [mdx()];
if (!isPR) {
  integrations.push(
    sitemap({
      filter: (page) => page && page !== '/robots.txt',
    })
  );
}

// https://astro.build/config
export default defineConfig({
  site: 'https://nanobot.srik.me',
  integrations,
});
