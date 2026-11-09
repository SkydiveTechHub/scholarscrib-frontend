import { SITEMAP_SHARDS } from "@/lib/seo/paths";
import { absoluteUrl } from "@/lib/seo/site";

// generateSitemaps (see ../sitemap.ts) emits /sitemap/<shard>.xml per shard and
// no index, so /sitemap.xml — the URL crawlers and people try first — would
// 404. This serves the standard sitemap index that points at every shard. It
// lives at /sitemap-index.xml because sitemap.ts reserves the /sitemap.xml path
// (a route handler there is a build conflict); next.config.ts rewrites
// /sitemap.xml to it.
export const revalidate = 86400;

export function GET() {
  const entries = SITEMAP_SHARDS.map(
    (shard) => `  <sitemap><loc>${absoluteUrl(`/sitemap/${shard}.xml`)}</loc></sitemap>`,
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
