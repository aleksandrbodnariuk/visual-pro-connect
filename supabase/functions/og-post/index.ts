const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://bcsocial.org';
const SITE_NAME = 'Спільнота B&C';
const FALLBACK_IMAGE = `${SITE_URL}/default-og.jpg`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripNewlines(str: string): string {
  return str.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

function ensureAbsoluteUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get('id');

    if (!postId) {
      return new Response('Missing id', { status: 400, headers: corsHeaders });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return new Response('Invalid id', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const postRes = await fetch(
      `${supabaseUrl}/rest/v1/posts?id=eq.${postId}&select=id,content,media_url,user_id,created_at`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const posts = await postRes.json();
    const post = posts?.[0];

    if (!post) {
      return new Response('Post not found', { status: 404, headers: corsHeaders });
    }

    let authorName = 'Користувач';
    let authorAvatar = '';
    if (post.user_id) {
      const userRes = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${post.user_id}&select=full_name,avatar_url`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      const users = await userRes.json();
      if (users?.[0]) {
        authorName = users[0].full_name || 'Користувач';
        authorAvatar = users[0].avatar_url || '';
      }
    }

    const contentText = post.content
      ? stripNewlines(post.content.replace(/(https?:\/\/[^\s]+)/g, ''))
      : '';

    const ogTitle = escapeHtml(
      contentText
        ? truncate(`${authorName}: ${contentText}`, 70)
        : `Публікація від ${authorName}`
    );

    const ogDescription = escapeHtml(
      contentText
        ? truncate(contentText, 200)
        : `Дивіться публікацію від ${authorName} у Спільноті B&C`
    );

    const rawImage = post.media_url || authorAvatar || '';
    const ogImage = ensureAbsoluteUrl(rawImage) || FALLBACK_IMAGE;
    const canonicalUrl = `${SITE_URL}/post/${postId}`;

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>${ogTitle} — ${SITE_NAME}</title>
  <meta name="description" content="${ogDescription}">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:locale" content="uk_UA">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
</head>
<body>
  <h1>${ogTitle}</h1>
  <p>${ogDescription}</p>
  <p><a href="${escapeHtml(canonicalUrl)}">Відкрити публікацію</a></p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('OG post error:', error);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
