export const config = { runtime: 'edge' };

const SUPABASE_FUNCTIONS_URL = 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U';

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/\/post\/([^/?#]+)/);
  const postId = pathMatch?.[1] || '';

  // If not a valid UUID, just serve the SPA
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
    return serveSpa(url);
  }

  try {
    // Fetch OG HTML from the existing Supabase edge function
    const ogRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/og-post?id=${postId}`, {
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
    });

    if (!ogRes.ok) {
      return serveSpa(url);
    }

    const ogHtml = await ogRes.text();

    // Extract OG meta tags, twitter meta tags, description, and canonical link
    const ogMetaTags = ogHtml.match(/<meta[^>]+property="og:[^"]+"[^>]*>/g) || [];
    const twitterMetaTags = ogHtml.match(/<meta[^>]+name="twitter:[^"]+"[^>]*>/g) || [];
    const descMeta = ogHtml.match(/<meta[^>]+name="description"[^>]*>/);
    const canonicalLink = ogHtml.match(/<link[^>]+rel="canonical"[^>]*>/);
    const titleMatch = ogHtml.match(/<title>([^<]+)<\/title>/);

    const dynamicTitle = titleMatch?.[1] || '';
    const injectedTags = [
      ...(descMeta ? [descMeta[0]] : []),
      ...ogMetaTags,
      ...twitterMetaTags,
      ...(canonicalLink ? [canonicalLink[0]] : []),
    ].join('\n    ');

    // If no tags were extracted, just serve the SPA unchanged
    if (!injectedTags.trim()) {
      return serveSpa(url);
    }

    // Fetch the SPA index.html
    const spaRes = await fetch(new URL('/index.html', url.origin));
    if (!spaRes.ok) {
      return serveSpa(url);
    }

    let html = await spaRes.text();

    // Remove existing generic OG/twitter meta tags from index.html
    html = html.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>\s*/g, '');
    html = html.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>\s*/g, '');

    // Replace the generic description with dynamic one if available
    if (descMeta) {
      html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, '');
    }

    // Replace title if we have a dynamic one
    if (dynamicTitle) {
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${dynamicTitle}</title>`);
    }

    // Inject dynamic OG tags before </head>
    html = html.replace('</head>', `    ${injectedTags}\n  </head>`);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (e) {
    return serveSpa(url);
  }
}

async function serveSpa(url: URL): Promise<Response> {
  try {
    const spaRes = await fetch(new URL('/index.html', url.origin));
    return new Response(await spaRes.text(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new Response('Server error', { status: 500 });
  }
}
