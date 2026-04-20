// Migrate existing portfolio photos: generate preview (≤400px) + display (≤1600px) JPEG variants.
// Uses wsrv.nl (free public image proxy) for resizing — avoids memory-heavy in-function decoding,
// which previously caused "Memory limit exceeded" with ImageScript on large photos.
// Original media_url is preserved as a fallback.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PREVIEW_MAX = 400;
const DISPLAY_MAX = 1600;
const PREVIEW_QUALITY = 72;
const DISPLAY_QUALITY = 85;
const BUCKET = 'portfolio';

interface MigrationDetail {
  id: string;
  status: 'processed' | 'skipped' | 'error';
  reason?: string;
  previewSize?: number;
  displaySize?: number;
  previewUrl?: string;
  displayUrl?: string;
}

interface MigrationResult {
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  remaining: number;
  details: MigrationDetail[];
}

// Build wsrv.nl transform URL. Strip protocol per wsrv requirements.
function buildResizeUrl(sourceUrl: string, maxDim: number, quality: number): string {
  const stripped = sourceUrl.replace(/^https?:\/\//, '');
  const params = new URLSearchParams({
    url: stripped,
    w: String(maxDim),
    h: String(maxDim),
    fit: 'inside',
    we: '', // without enlargement
    output: 'jpg',
    q: String(quality),
  });
  return `https://wsrv.nl/?${params.toString()}`;
}

async function fetchVariant(sourceUrl: string, maxDim: number, quality: number): Promise<Uint8Array> {
  const url = buildResizeUrl(sourceUrl, maxDim, quality);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`wsrv ${resp.status}`);
  return new Uint8Array(await resp.arrayBuffer());
}

async function processOne(
  item: { id: string; user_id: string; media_url: string; media_preview_url: string | null; media_display_url: string | null },
  supabase: ReturnType<typeof createClient>,
  dryRun: boolean,
): Promise<MigrationDetail> {
  if (!item.media_url) return { id: item.id, status: 'skipped', reason: 'no media_url' };
  if (item.media_preview_url && item.media_display_url) {
    return { id: item.id, status: 'skipped', reason: 'variants already exist' };
  }

  if (dryRun) return { id: item.id, status: 'processed', reason: 'dry-run' };

  // Generate variants via external resize proxy (no in-memory decoding here)
  let previewBytes: Uint8Array;
  let displayBytes: Uint8Array;
  try {
    previewBytes = await fetchVariant(item.media_url, PREVIEW_MAX, PREVIEW_QUALITY);
    displayBytes = await fetchVariant(item.media_url, DISPLAY_MAX, DISPLAY_QUALITY);
  } catch (e) {
    return { id: item.id, status: 'error', reason: `resize: ${e instanceof Error ? e.message : String(e)}` };
  }

  const ts = Date.now();
  const idSlice = item.id.slice(0, 8);
  const previewPath = `optimized/${item.user_id}/${ts}-${idSlice}-preview.jpg`;
  const displayPath = `optimized/${item.user_id}/${ts}-${idSlice}-display.jpg`;

  const [{ error: prevErr }, { error: dispErr }] = await Promise.all([
    supabase.storage.from(BUCKET).upload(previewPath, previewBytes, {
      contentType: 'image/jpeg', upsert: false, cacheControl: '604800',
    }),
    supabase.storage.from(BUCKET).upload(displayPath, displayBytes, {
      contentType: 'image/jpeg', upsert: false, cacheControl: '604800',
    }),
  ]);

  if (prevErr || dispErr) {
    await supabase.storage.from(BUCKET).remove([previewPath, displayPath]).catch(() => {});
    return { id: item.id, status: 'error', reason: `upload: ${(prevErr || dispErr)?.message}` };
  }

  const previewPublicUrl = supabase.storage.from(BUCKET).getPublicUrl(previewPath).data.publicUrl;
  const displayPublicUrl = supabase.storage.from(BUCKET).getPublicUrl(displayPath).data.publicUrl;

  const { error: updateErr } = await supabase
    .from('portfolio')
    .update({
      media_preview_url: previewPublicUrl,
      media_display_url: displayPublicUrl,
    })
    .eq('id', item.id);

  if (updateErr) {
    await supabase.storage.from(BUCKET).remove([previewPath, displayPath]).catch(() => {});
    return { id: item.id, status: 'error', reason: `db update: ${updateErr.message}` };
  }

  return {
    id: item.id,
    status: 'processed',
    previewSize: previewBytes.byteLength,
    displaySize: displayBytes.byteLength,
    previewUrl: previewPublicUrl,
    displayUrl: displayPublicUrl,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const { data: isAdmin } = await supabase.rpc('is_user_admin', { _user_id: userData.user.id });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun === true;
  // External resize is lightweight — we can safely process more per call
  const requested = typeof body.limit === 'number' ? body.limit : 10;
  const limit = Math.min(Math.max(1, requested), 20);

  const { data: items, error: fetchErr } = await supabase
    .from('portfolio')
    .select('id, user_id, media_url, media_preview_url, media_display_url')
    .eq('media_type', 'photo')
    .or('media_preview_url.is.null,media_display_url.is.null')
    .order('created_at', { ascending: true })
    .limit(limit);

  const { count: remainingCount } = await supabase
    .from('portfolio')
    .select('id', { count: 'exact', head: true })
    .eq('media_type', 'photo')
    .or('media_preview_url.is.null,media_display_url.is.null');

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const result: MigrationResult = {
    total: items?.length || 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    remaining: remainingCount || 0,
    details: [],
  };

  for (const item of items || []) {
    try {
      const detail = await processOne(item as any, supabase, dryRun);
      result.details.push(detail);
      if (detail.status === 'processed') result.processed++;
      else if (detail.status === 'skipped') result.skipped++;
      else result.errors++;
      console.log(`[${detail.status}] ${item.id}: ${detail.reason || `preview=${detail.previewSize || 0}b display=${detail.displaySize || 0}b`}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors++;
      result.details.push({ id: item.id, status: 'error', reason: msg });
      console.error(`[ERR] ${item.id}:`, msg);
    }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
