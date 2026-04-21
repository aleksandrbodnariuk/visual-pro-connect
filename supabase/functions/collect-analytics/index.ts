import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Bot detection (scoring) ---
const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /headless/i, /phantom/i, /lighthouse/i, /pingdom/i,
  /gtmetrix/i, /pagespeed/i, /wget/i, /curl/i,
  /python/i, /node/i, /axios/i, /httpclient/i, /scrapy/i,
];

function isBotScoring(req: Request): boolean {
  const ua = req.headers.get("user-agent") || "";
  if (!ua) return true;

  let score = 0;
  // UA pattern match = strong signal
  if (BOT_UA_PATTERNS.some((p) => p.test(ua))) score += 3;
  // Missing accept-language is suspicious
  if (!req.headers.get("accept-language")) score += 1;
  // Very short UA
  if (ua.length < 20) score += 1;

  return score >= 3;
}

// --- IP extraction ---
const PRIVATE_RANGES = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^0\./, /^::1$/, /^fc00/i, /^fe80/i, /^fd/i, /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./, 
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

function getClientIp(req: Request): { ip: string | null; source: string } {
  // Priority order for proxy headers
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
  ];

  for (const header of headers) {
    const val = req.headers.get(header);
    if (!val) continue;

    if (header === "x-forwarded-for") {
      // Parse comma-separated list, find first public IP
      const ips = val.split(",").map((s) => s.trim().replace(/:\d+$/, ""));
      for (const candidate of ips) {
        if (candidate && !isPrivateIp(candidate)) {
          return { ip: candidate, source: "x-forwarded-for" };
        }
      }
    } else {
      const cleaned = val.trim().replace(/:\d+$/, "");
      if (cleaned && !isPrivateIp(cleaned)) {
        return { ip: cleaned, source: header };
      }
    }
  }

  return { ip: null, source: "none" };
}

// --- Geo lookup via ip-api.com (free, JSON over HTTP for server-side) ---
async function geoLookup(ip: string): Promise<{
  country_code?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  ok: boolean;
}> {
  if (!ip) return { ok: false };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    // ip-api.com free tier is HTTP only for server-to-server; it's fine from edge function
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,countryCode,country,regionName,city,timezone`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) { await res.text(); return { ok: false }; }
    const data = await res.json();
    if (data.status !== "success") return { ok: false };
    return {
      country_code: data.countryCode || undefined,
      country: data.country || undefined,
      region: data.regionName || undefined,
      city: data.city || undefined,
      timezone: data.timezone || undefined,
      ok: true,
    };
  } catch {
    return { ok: false };
  }
}

// --- Extract referrer domain ---
function extractDomain(ref: string | null): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).hostname || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  try {
    // Bot check
    const is_bot = isBotScoring(req);
    if (is_bot) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "bot", is_bot: true }),
        { headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const body = await req.json();
    const events: any[] = Array.isArray(body) ? body : [body];

    if (events.length === 0 || events.length > 20) {
      return new Response(
        JSON.stringify({ ok: false, reason: "invalid_batch_size" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Get client IP
    const { ip, source: ip_source } = getClientIp(req);

    // Try Cloudflare country header first
    const cfCountry = req.headers.get("cf-ipcountry");
    let geo: { country_code?: string; country?: string; region?: string; city?: string; timezone?: string; ok: boolean } = { ok: false };

    if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
      geo = { country_code: cfCountry, ok: true };
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
      user_id: e.user_id && typeof e.user_id === "string" ? e.user_id : null,
      country_code: geo.country_code || null,
      country: geo.country || null,
      region: geo.region || null,
      city: geo.city || null,
      device_type: e.device_type ? String(e.device_type).slice(0, 20) : null,
      language: e.language ? String(e.language).slice(0, 20) : null,
      timezone: e.timezone || geo.timezone || null,
      occurred_at: e.occurred_at || new Date().toISOString(),
    }));

    const { error } = await supabase.from("analytics_events").insert(rows);
    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ ok: false, reason: "db_error", ip_source, geo_ok: geo.ok }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        count: rows.length,
        ip_source,
        geo_ok: geo.ok,
        country_code: geo.country_code || null,
        is_bot: false,
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (err) {
    console.error("Collect analytics error:", err);
    return new Response(
      JSON.stringify({ ok: false, reason: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
