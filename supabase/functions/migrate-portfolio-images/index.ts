// Migrate existing portfolio photos: download (pre-resized via Supabase Image Transform) → WebP encode → upload → update DB → delete old
// Memory-safe: relies on Supabase render endpoint to resize before download, then jsquash only encodes WebP.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import decodeJpeg, { init as initJpegDecode } from 'https://esm.sh/@jsquash/jpeg@1.5.0/decode';
import decodePng, { init as initPngDecode } from 'https://esm.sh/@jsquash/png@3.0.1/decode';
import decodeWebp, { init as initWebpDecode } from 'https://esm.sh/@jsquash/webp@1.4.0/decode';
import encodeWebp, { init as initWebpEncode } from 'https://esm.sh/@jsquash/webp@1.4.0/encode';

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
 * Build a URL that uses Supabase server-side image transform to pre-resize.
 * This dramatically reduces memory usage in the edge function.
 */
function buildResizedUrl(publicUrl: string, bucket: string, supabaseUrl: string): string | null {
  const path = extractStoragePath(publicUrl, bucket);
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${path}?width=${MAX_DIM}&height=${MAX_DIM}&resize=contain&quality=85&format=origin`;
}

async function decodeImage(buffer: ArrayBuffer, contentType: string): Promise<ImageData> {
  const ct = contentType.toLowerCase();
  if (ct.includes('png')) {
    await initPngDecode();
    return await decodePng(buffer);
  }
  if (ct.includes('webp')) {
    await initWebpDecode();
    return await decodeWebp(buffer);
  }
  // jpeg / jpg / unknown → try jpeg
  await initJpegDecode();
  return await decodeJpeg(buffer);
}

async function processImage(buffer: ArrayBuffer, contentType: string): Promise<Uint8Array> {
  const imageData = await decodeImage(buffer, contentType);
  await initWebpEncode();
  const encoded = await encodeWebp(imageData, { quality: QUALITY });
  return new Uint8Array(encoded);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Verify caller is admin
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
  // Hard cap to keep memory usage safe; UI may request more but we clamp.
  const requested = typeof body.limit === 'number' ? body.limit : 10;
  const limit = Math.min(Math.max(1, requested), 10);

  // Only fetch records that are NOT yet optimized.
  // After successful migration, media_url contains '/optimized/' — so those are skipped at the SQL level.
  const { data: items, error: fetchErr } = await supabase
    .from('portfolio')
    .select('id, user_id, media_url')
    .eq('media_type', 'photo')
    .not('media_url', 'ilike', '%/optimized/%')
    .order('created_at', { ascending: true })
    .limit(limit);

  // Also report total remaining (un-optimized) count for the UI
  const { count: remainingCount } = await supabase
    .from('portfolio')
    .select('id', { count: 'exact', head: true })
    .eq('media_type', 'photo')
    .not('media_url', 'ilike', '%/optimized/%');

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const result: MigrationResult = { total: items?.length || 0, processed: 0, skipped: 0, errors: 0, details: [] };

  for (const item of items || []) {
    try {
      if (!item.media_url) {
        result.skipped++;
        result.details.push({ id: item.id, status: 'skipped', reason: 'no media_url' });
        continue;
      }

      // Skip if already in optimized folder
      if (item.media_url.includes('/optimized/')) {
        result.skipped++;
        result.details.push({ id: item.id, status: 'skipped', reason: 'already optimized' });
        continue;
      }

      // HEAD original to know its size (for skip + reporting)
      let oldSize = 0;
      try {
        const head = await fetch(item.media_url, { method: 'HEAD' });
        oldSize = parseInt(head.headers.get('content-length') || '0', 10);
      } catch {
        // ignore — we'll get the size from the transformed download
      }

      if (oldSize > 0 && oldSize < SKIP_BELOW_BYTES) {
        result.skipped++;
        result.details.push({ id: item.id, status: 'skipped', reason: 'below 500KB', oldSize });
        continue;
      }

      if (dryRun) {
        result.details.push({ id: item.id, status: 'processed', reason: 'dry-run', oldSize });
        result.processed++;
        continue;
      }

      // Download via Supabase Image Transform — server-side resize to MAX_DIM.
      // This keeps the edge function memory low even for 14MB originals.
      const resizedUrl = buildResizedUrl(item.media_url, BUCKET, supabaseUrl);
      const downloadUrl = resizedUrl || item.media_url;
      const resp = await fetch(downloadUrl);
      if (!resp.ok) {
        // Fallback: if render endpoint failed, try original (size cap below will protect us)
        if (resizedUrl) {
          const fallback = await fetch(item.media_url);
          if (!fallback.ok) {
            result.errors++;
            result.details.push({ id: item.id, status: 'error', reason: `download failed: ${resp.status}` });
            continue;
          }
          var contentType = fallback.headers.get('content-type') || 'image/jpeg';
          var originalBuffer = await fallback.arrayBuffer();
        } else {
          result.errors++;
          result.details.push({ id: item.id, status: 'error', reason: `download failed: ${resp.status}` });
          continue;
        }
      } else {
        var contentType = resp.headers.get('content-type') || 'image/jpeg';
        var originalBuffer = await resp.arrayBuffer();
      }

      // Safety cap: refuse to process > 8 MB inside the function (would risk OOM)
      if (originalBuffer.byteLength > 8 * 1024 * 1024) {
        result.errors++;
        result.details.push({ id: item.id, status: 'error', reason: `too large after resize: ${originalBuffer.byteLength}b`, oldSize });
        continue;
      }

      // Encode → WebP
      const optimized = await processImage(originalBuffer, contentType);
      const newSize = optimized.byteLength;

      // Free original buffer reference ASAP
      // @ts-ignore
      originalBuffer = null;

      // Upload to optimized/{userId}/{timestamp}-{shortId}.webp
      const newPath = `optimized/${item.user_id}/${Date.now()}-${item.id.slice(0, 8)}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, optimized, { contentType: 'image/webp', upsert: false, cacheControl: '604800' });

      if (uploadErr) {
        result.errors++;
        result.details.push({ id: item.id, status: 'error', reason: `upload: ${uploadErr.message}` });
        continue;
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
      const newUrl = pub.publicUrl;

      // Update DB
      const { error: updateErr } = await supabase
        .from('portfolio')
        .update({ media_url: newUrl })
        .eq('id', item.id);

      if (updateErr) {
        await supabase.storage.from(BUCKET).remove([newPath]).catch(() => {});
        result.errors++;
        result.details.push({ id: item.id, status: 'error', reason: `db update: ${updateErr.message}` });
        continue;
      }

      // Delete old file
      const oldPath = extractStoragePath(item.media_url, BUCKET);
      if (oldPath && oldPath !== newPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]).catch((e) => {
          console.warn(`Failed to remove old file ${oldPath}:`, e);
        });
      }

      result.processed++;
      result.details.push({ id: item.id, status: 'processed', oldSize, newSize, newUrl });
      console.log(`[OK] ${item.id}: ${oldSize}b → ${newSize}b`);
    } catch (e) {
      result.errors++;
      const msg = e instanceof Error ? e.message : String(e);
      result.details.push({ id: item.id, status: 'error', reason: msg });
      console.error(`[ERR] ${item.id}:`, msg);
    }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
