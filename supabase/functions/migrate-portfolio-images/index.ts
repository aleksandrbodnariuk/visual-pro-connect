// Migrate existing portfolio photos: download → resize (max 1200px) → WebP (q=0.8) → upload → update DB → delete old
// Uses @jsquash WASM libs (Sharp is not available in Deno)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import decodeJpeg, { init as initJpegDecode } from 'https://esm.sh/@jsquash/jpeg@1.5.0/decode';
import decodePng, { init as initPngDecode } from 'https://esm.sh/@jsquash/png@3.0.1/decode';
import decodeWebp, { init as initWebpDecode } from 'https://esm.sh/@jsquash/webp@1.4.0/decode';
import encodeWebp, { init as initWebpEncode } from 'https://esm.sh/@jsquash/webp@1.4.0/encode';
import resize, { initResize } from 'https://esm.sh/@jsquash/resize@2.1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_DIM = 1200;
const QUALITY = 80; // 0-100 for jsquash
const SKIP_BELOW_BYTES = 500 * 1024; // 500KB
const BUCKET = 'portfolio';

interface MigrationResult {
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  details: Array<{ id: string; status: 'processed' | 'skipped' | 'error'; reason?: string; oldSize?: number; newSize?: number; newUrl?: string }>;
}

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length).split('?')[0];
}

async function decodeImage(buffer: ArrayBuffer, contentType: string): Promise<ImageData> {
  const ct = contentType.toLowerCase();
  if (ct.includes('jpeg') || ct.includes('jpg')) {
    await initJpegDecode();
    return await decodeJpeg(buffer);
  }
  if (ct.includes('png')) {
    await initPngDecode();
    return await decodePng(buffer);
  }
  if (ct.includes('webp')) {
    await initWebpDecode();
    return await decodeWebp(buffer);
  }
  // Fallback: try jpeg first, then png
  try {
    await initJpegDecode();
    return await decodeJpeg(buffer);
  } catch {
    await initPngDecode();
    return await decodePng(buffer);
  }
}

async function processImage(buffer: ArrayBuffer, contentType: string): Promise<ArrayBuffer> {
  let imageData = await decodeImage(buffer, contentType);

  // Resize if needed (preserve aspect ratio)
  const { width, height } = imageData;
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    const newW = Math.round(width * ratio);
    const newH = Math.round(height * ratio);
    await initResize();
    imageData = await resize(imageData, { width: newW, height: newH });
  }

  await initWebpEncode();
  const encoded = await encodeWebp(imageData, { quality: QUALITY });
  return encoded;
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
  const limit = typeof body.limit === 'number' ? body.limit : 100;

  const { data: items, error: fetchErr } = await supabase
    .from('portfolio')
    .select('id, user_id, media_url')
    .eq('media_type', 'photo')
    .limit(limit);

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

      // Download
      const resp = await fetch(item.media_url);
      if (!resp.ok) {
        result.errors++;
        result.details.push({ id: item.id, status: 'error', reason: `download failed: ${resp.status}` });
        continue;
      }
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      const originalBuffer = await resp.arrayBuffer();
      const oldSize = originalBuffer.byteLength;

      // Skip small files (<500KB)
      if (oldSize < SKIP_BELOW_BYTES) {
        result.skipped++;
        result.details.push({ id: item.id, status: 'skipped', reason: 'below 500KB', oldSize });
        continue;
      }

      if (dryRun) {
        result.details.push({ id: item.id, status: 'processed', reason: 'dry-run', oldSize });
        result.processed++;
        continue;
      }

      // Compress
      const optimized = await processImage(originalBuffer, contentType);
      const newSize = optimized.byteLength;

      // Upload to optimized/{userId}/{timestamp}.webp
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
        // Rollback uploaded file
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
      console.log(`[OK] ${item.id}: ${oldSize} → ${newSize} bytes (${Math.round((1 - newSize / oldSize) * 100)}% reduction)`);
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
