import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
  favicon: string | null;
}

// SSRF protection: block internal/private network URLs
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', '[::1]', 'metadata.google.internal'];

function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return true;
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))) return true;
    // Block private IP ranges
    if (/^10\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
    return false;
  } catch {
    return true;
  }
}

function extractMetaContent(html: string, selectors: string[]): string | null {
  for (const selector of selectors) {
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${selector}["'][^>]*content=["']([^"']+)["']|<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${selector}["']`,
      'i'
    );
    const match = html.match(regex);
    if (match) {
      return match[1] || match[2];
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const ogTitle = extractMetaContent(html, ['og:title']);
  if (ogTitle) return ogTitle;
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const iconRegex = /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']|<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/gi;
  const match = iconRegex.exec(html);
  
  if (match) {
    const iconUrl = match[1] || match[2];
    if (iconUrl.startsWith('http')) {
      return iconUrl;
    } else if (iconUrl.startsWith('//')) {
      return 'https:' + iconUrl;
    } else if (iconUrl.startsWith('/')) {
      const url = new URL(baseUrl);
      return url.origin + iconUrl;
    }
  }

  try {
    const url = new URL(baseUrl);
    return url.origin + '/favicon.ico';
  } catch {
    return null;
  }
}

function makeAbsoluteUrl(url: string | null, baseUrl: string): string | null {
  if (!url) return null;
  
  if (url.startsWith('http')) {
    return url;
  } else if (url.startsWith('//')) {
    return 'https:' + url;
  } else if (url.startsWith('/')) {
    try {
      const base = new URL(baseUrl);
      return base.origin + url;
    } catch {
      return url;
    }
  }
  return url;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication: verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SSRF protection
    if (isBlockedUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching link preview for:', url);

    // Fetch with timeout to prevent abuse
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    // Limit response size to 1MB to prevent memory abuse
    const text = await response.text();
    const html = text.slice(0, 1_000_000);

    const preview: LinkPreviewData = {
      url,
      title: extractTitle(html),
      description: extractMetaContent(html, ['og:description', 'description', 'twitter:description']),
      image: makeAbsoluteUrl(
        extractMetaContent(html, ['og:image', 'twitter:image', 'twitter:image:src']),
        url
      ),
      siteName: extractMetaContent(html, ['og:site_name']) || new URL(url).hostname,
      favicon: extractFavicon(html, url),
    };

    console.log('Preview extracted:', preview.title);

    return new Response(
      JSON.stringify({ success: true, data: preview }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch preview' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
