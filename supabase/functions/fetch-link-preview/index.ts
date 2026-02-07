const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
  favicon: string | null;
}

function extractMetaContent(html: string, selectors: string[]): string | null {
  for (const selector of selectors) {
    // Match property/name based meta tags
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
  // Try og:title first
  const ogTitle = extractMetaContent(html, ['og:title']);
  if (ogTitle) return ogTitle;

  // Fallback to <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  // Look for link rel="icon" or rel="shortcut icon"
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

  // Fallback to /favicon.ico
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
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching link preview for:', url);

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Extract Open Graph and fallback metadata
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
        error: error instanceof Error ? error.message : 'Failed to fetch preview' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
