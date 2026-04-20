// Migrate existing portfolio photos: generate preview (≤400px) + display (≤1600px) WebP variants.
// Uses ImageScript (pure-JS, works on Supabase Free tier — no Image Transform feature required).
// Original media_url is preserved as a fallback.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PREVIEW_MAX = 400;
const DISPLAY_MAX = 1600;
const BUCKET = 'portfolio';
// ImageScript encodeWEBP is lossless only — we use JPEG with high quality as a smaller-than-PNG fallback.
// For most browsers JPEG is fine; we still cut size dramatically by resizing.
const PREVIEW_JPEG_QUALITY = 72;
const DISPLAY_JPEG_QUALITY = 85;

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

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length).split('?')[0];
}

async function buildVariant(img: Image, maxDim: number, quality: number): Promise<Uint8Array> {
  const { width, height } = img;
  let w = width;
  let h = height;
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
  }
  // Clone before resize so we don't mutate the source for the next variant
  const clone = img.clone().resize(w, h);
  // encodeJPEG is faster + smaller than encode(PNG) and supported by ImageScript
  return await clone.encodeJPEG(quality);
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

  // Download original
  let originalBytes: Uint8Array;
  try {
    const resp = await fetch(item.media_url);
    if (!resp.ok) return { id: item.id, status: 'error', reason: `download ${resp.status}` };
    originalBytes = new Uint8Array(await resp.arrayBuffer());
  } catch (e) {
    return { id: item.id, status: 'error', reason: `fetch: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Decode (supports JPEG, PNG, GIF, WebP)
  let img: Image;
  try {
    img = await Image.decode(originalBytes);
  } catch (e) {
    return { id: item.id, status: 'error', reason: `decode: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Generate variants sequentially to limit memory peak
  let previewBytes: Uint8Array;
  let displayBytes: Uint8Array;
  try {
    previewBytes = await buildVariant(img, PREVIEW_MAX, PREVIEW_JPEG_QUALITY);
    displayBytes = await buildVariant(img, DISPLAY_MAX, DISPLAY_JPEG_QUALITY);
  } catch (e) {
    return { id: item.id, status: 'error', reason: `encode: ${e instanceof Error ? e.message : String(e)}` };
  }

  const ts = Date.now();
  const idSlice = item.id.slice(0, 8);
  // Store as .jpg (we encoded JPEG). Field names stay as media_preview_url / media_display_url.
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
    return {
      id: item.id,
      status: 'error',
      reason: `upload: ${(prevErr || dispErr)?.message}`,
    };
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
  // ImageScript is CPU-heavy; cap at 5 per invocation to stay safely under timeouts
  const requested = typeof body.limit === 'number' ? body.limit : 5;
  const limit = Math.min(Math.max(1, requested), 5);

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
