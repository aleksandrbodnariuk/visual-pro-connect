const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://bcsocial.org';
const SITE_NAME = 'Спільнота B&C';
const DEFAULT_IMAGE = `${SITE_URL}/lovable-uploads/4c2129b2-6d63-43a9-9c10-18cf11008adb.png`;

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get('id');

    if (!postId) {
      return Response.redirect(SITE_URL, 302);
    }

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return Response.redirect(SITE_URL, 302);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Fetch post data using service role (no auth needed for public OG tags)
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
      return Response.redirect(`${SITE_URL}`, 302);
    }

    // Fetch author
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

    // Build OG data
    const contentText = post.content
      ? post.content.replace(/(https?:\/\/[^\s]+)/g, '').trim()
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

    // Use post image if available, otherwise default
    const ogImage = post.media_url || DEFAULT_IMAGE;
    const canonicalUrl = `${SITE_URL}/post/${postId}`;

    // Return HTML with OG tags + redirect for real users
    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>${ogTitle} — ${SITE_NAME}</title>
  <meta name="description" content="${ogDescription}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:locale" content="uk_UA">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  
  <!-- Redirect real users to the actual page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
</head>
<body>
  <p>Перенаправлення на <a href="${escapeHtml(canonicalUrl)}">${SITE_NAME}</a>...</p>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('OG post error:', error);
    return Response.redirect(SITE_URL, 302);
  }
});
