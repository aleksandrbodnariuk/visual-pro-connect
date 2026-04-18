// Migrate existing portfolio photos using Supabase Image Transform to convert directly to WebP.
// Zero in-function image processing — Supabase Render endpoint does resize + format conversion server-side.
// This is the most memory-safe approach possible: function only fetches → uploads.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_DIM = 1200;
const QUALITY = 80;
const SKIP_BELOW_BYTES = 500 * 1024;
const BUCKET = 'portfolio';

interface MigrationDetail {
  id: string;
  status: 'processed' | 'skipped' | 'error';
  reason?: string;
  oldSize?: number;
  newSize?: number;
  newUrl?: string;
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

/**
 * Build a URL that uses Supabase Image Transform to BOTH resize AND convert to WebP.
 * Format=webp triggers server-side transcode — we never touch raw pixels in the function.
 */
function buildWebpUrl(publicUrl: string, bucket: string, supabaseUrl: string): string | null {
  const path = extractStoragePath(publicUrl, bucket);
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${path}?width=${MAX_DIM}&height=${MAX_DIM}&resize=contain&quality=${QUALITY}&format=webp`;
}

async function processOne(
  item: { id: string; user_id: string; media_url: string },
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  dryRun: boolean,
): Promise<MigrationDetail> {
  if (!item.media_url) return { id: item.id, status: 'skipped', reason: 'no media_url' };
  if (item.media_url.includes('/optimized/')) {
    return { id: item.id, status: 'skipped', reason: 'already optimized' };
  }

  // HEAD original
  let oldSize = 0;
  try {
    const head = await fetch(item.media_url, { method: 'HEAD' });
    oldSize = parseInt(head.headers.get('content-length') || '0', 10);
  } catch { /* ignore */ }

  if (oldSize > 0 && oldSize < SKIP_BELOW_BYTES) {
    return { id: item.id, status: 'skipped', reason: 'below 500KB', oldSize };
  }

  if (dryRun) {
    return { id: item.id, status: 'processed', reason: 'dry-run', oldSize };
  }

  // Server-side: resize + transcode to WebP. We just download the result.
  const webpUrl = buildWebpUrl(item.media_url, BUCKET, supabaseUrl);
  if (!webpUrl) {
    return { id: item.id, status: 'error', reason: 'cannot build transform URL', oldSize };
  }

  const resp = await fetch(webpUrl);
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return { id: item.id, status: 'error', reason: `transform failed ${resp.status}: ${txt.slice(0, 100)}`, oldSize };
  }

  const optimized = new Uint8Array(await resp.arrayBuffer());
  const newSize = optimized.byteLength;

  // Sanity: WebP signature 'RIFF....WEBP'
  if (newSize < 100 || optimized[0] !== 0x52 /* R */ || optimized[8] !== 0x57 /* W */) {
    return { id: item.id, status: 'error', reason: 'invalid WebP from transform', oldSize, newSize };
  }

  const newPath = `optimized/${item.user_id}/${Date.now()}-${item.id.slice(0, 8)}.webp`;
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, optimized, { contentType: 'image/webp', upsert: false, cacheControl: '604800' });

  if (uploadErr) {
    return { id: item.id, status: 'error', reason: `upload: ${uploadErr.message}`, oldSize };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
  const newUrl = pub.publicUrl;

  const { error: updateErr } = await supabase
    .from('portfolio')
    .update({ media_url: newUrl })
    .eq('id', item.id);

  if (updateErr) {
    await supabase.storage.from(BUCKET).remove([newPath]).catch(() => {});
    return { id: item.id, status: 'error', reason: `db update: ${updateErr.message}`, oldSize };
  }

  // Delete old
  const oldPath = extractStoragePath(item.media_url, BUCKET);
  if (oldPath && oldPath !== newPath) {
    await supabase.storage.from(BUCKET).remove([oldPath]).catch((e) => {
      console.warn(`Failed to remove old file ${oldPath}:`, e);
    });
  }

  return { id: item.id, status: 'processed', oldSize, newSize, newUrl };
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
  // Now we can safely process more — no in-function image decoding
  const requested = typeof body.limit === 'number' ? body.limit : 10;
  const limit = Math.min(Math.max(1, requested), 20);

  const { data: items, error: fetchErr } = await supabase
    .from('portfolio')
    .select('id, user_id, media_url')
    .eq('media_type', 'photo')
    .not('media_url', 'ilike', '%/optimized/%')
    .order('created_at', { ascending: true })
    .limit(limit);

  const { count: remainingCount } = await supabase
    .from('portfolio')
    .select('id', { count: 'exact', head: true })
    .eq('media_type', 'photo')
    .not('media_url', 'ilike', '%/optimized/%');

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

  // Sequential — keeps things predictable & memory-safe
  for (const item of items || []) {
    try {
      const detail = await processOne(item as any, supabase, supabaseUrl, dryRun);
      result.details.push(detail);
      if (detail.status === 'processed') result.processed++;
      else if (detail.status === 'skipped') result.skipped++;
      else result.errors++;
      console.log(`[${detail.status}] ${item.id}: ${detail.reason || `${detail.oldSize || 0}b → ${detail.newSize || 0}b`}`);
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
