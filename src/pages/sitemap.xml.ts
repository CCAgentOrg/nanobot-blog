import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const posts = await getCollection('blog');
  const siteUrl = context.site?.toString() || 'https://nanobot.srik.me';

  const urls = [
    {
      loc: siteUrl,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      loc: `${siteUrl}/blog/`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.9,
    },
    ...posts.map((post) => ({
      loc: `${siteUrl}/blog/${post.slug}/`,
      lastmod: post.data.publishDate.toISOString(),
      changefreq: 'monthly',
      priority: 0.8,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
