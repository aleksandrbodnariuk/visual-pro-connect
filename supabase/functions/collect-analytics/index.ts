import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple bot detection
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /headless/i, /phantom/i, /lighthouse/i, /pingdom/i,
  /gtmetrix/i, /pagespeed/i, /wget/i, /curl/i,
];

function isBot(ua: string | null): boolean {
  if (!ua) return true;
  return BOT_PATTERNS.some((p) => p.test(ua));
}

// Extract referrer domain
function extractDomain(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const url = new URL(ref);
    return url.hostname || null;
  } catch {
    return null;
  }
}

// Geo lookup using ip-api.com (free, no key needed, 45 req/min)
async function geoLookup(ip: string): Promise<{ country?: string; region?: string; city?: string }> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return {};
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,regionName,city`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) { await res.text(); return {}; }
    const data = await res.json();
    if (data.status !== "success") return {};
    return {
      country: data.country || undefined,
      region: data.regionName || undefined,
      city: data.city || undefined,
    };
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const ua = req.headers.get("user-agent");
    if (isBot(ua)) {
      return new Response(JSON.stringify({ ok: true, skipped: "bot" }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const body = await req.json();
    const events: any[] = Array.isArray(body) ? body : [body];

    if (events.length === 0 || events.length > 20) {
      return new Response(JSON.stringify({ error: "Invalid batch size" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Get client IP for geo lookup — do NOT store it
    const ip =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";

    // Try Cloudflare country header first
    const cfCountry = req.headers.get("cf-ipcountry");
    let geo: { country?: string; region?: string; city?: string } = {};

    if (cfCountry && cfCountry !== "XX") {
      geo = { country: cfCountry };
    } else if (ip) {
      geo = await geoLookup(ip);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const rows = events.map((e: any) => ({
      event_type: String(e.event_type || "page_view").slice(0, 50),
      path: String(e.path || "/").slice(0, 500),
      ref_domain: extractDomain(e.referrer) || e.ref_domain || null,
      utm_source: e.utm_source ? String(e.utm_source).slice(0, 200) : null,
      utm_medium: e.utm_medium ? String(e.utm_medium).slice(0, 200) : null,
      utm_campaign: e.utm_campaign ? String(e.utm_campaign).slice(0, 200) : null,
      visitor_id: String(e.visitor_id || "unknown").slice(0, 100),
      session_id: String(e.session_id || "unknown").slice(0, 100),
      country: e.country || geo.country || null,
      region: e.region || geo.region || null,
      city: e.city || geo.city || null,
      device_type: e.device_type ? String(e.device_type).slice(0, 20) : null,
      language: e.language ? String(e.language).slice(0, 20) : null,
      timezone: e.timezone ? String(e.timezone).slice(0, 50) : null,
      occurred_at: e.occurred_at || new Date().toISOString(),
    }));

    const { error } = await supabase.from("analytics_events").insert(rows);
    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Collect analytics error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
