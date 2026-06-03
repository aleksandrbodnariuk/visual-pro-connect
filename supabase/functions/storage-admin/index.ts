import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Buckets and the DB columns that reference them. Used for orphan detection.
const BUCKET_REFS: Record<string, Array<{ table: string; column: string }>> = {
  avatars: [{ table: "users", column: "avatar_url" }],
  banners: [
    { table: "users", column: "banner_url" },
    { table: "user_vip_memberships", column: "custom_banner_url" },
  ],
  "group-avatars": [{ table: "conversations", column: "avatar_url" }],
  logos: [], // managed via site_settings JSON — treat all as referenced
  marketplace: [
    { table: "marketplace_listings", column: "cover_image_url" },
    { table: "marketplace_listing_images", column: "image_url" },
  ],
  "message-attachments": [{ table: "messages", column: "attachment_url" }],
  portfolio: [
    { table: "portfolio", column: "media_url" },
    { table: "portfolio", column: "media_preview_url" },
    { table: "portfolio", column: "media_display_url" },
  ],
  posts: [
    { table: "posts", column: "media_url" },
    { table: "user_files", column: "file_url" },
  ],
  "support-attachments": [{ table: "support_tickets", column: "attachment_url" }],
};

function pathFromUrl(url: string | null, bucket: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length).split("?")[0] || null;
}

async function listAllObjects(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix = "",
): Promise<Array<{ name: string; size: number }>> {
  const out: Array<{ name: string; size: number }> = [];
  const limit = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders in Supabase storage list have id=null
      if ((entry as any).id === null || entry.metadata == null) {
        const nested = await listAllObjects(admin, bucket, fullPath);
        out.push(...nested);
      } else {
        out.push({
          name: fullPath,
          size: Number((entry.metadata as any)?.size ?? 0),
        });
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}

async function getReferencedPaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
): Promise<Set<string>> {
  const refs = BUCKET_REFS[bucket] || [];
  const set = new Set<string>();
  for (const ref of refs) {
    let from = 0;
    const chunk = 1000;
    while (true) {
      const { data, error } = await (admin as any)
        .from(ref.table)
        .select(ref.column)
        .not(ref.column, "is", null)
        .range(from, from + chunk - 1);
      if (error) throw new Error(`db ${ref.table}.${ref.column}: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const row of data) {
        const p = pathFromUrl(row[ref.column], bucket);
        if (p) set.add(p);
      }
      if (data.length < chunk) break;
      from += chunk;
    }
  }
  return set;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = body?.action as string;
  const internalSecret = req.headers.get("x-internal-secret") || "";

  // --- INTERNAL: trigger-driven cleanup ---
  if (action === "delete-paths") {
    const { data: secretRow } = await admin
      .from("app_secrets")
      .select("value")
      .eq("key", "storage_cleanup_secret")
      .maybeSingle();
    if (!secretRow || internalSecret !== (secretRow as any).value) {
      return json({ error: "Unauthorized" }, 401);
    }
    const items = Array.isArray(body.items) ? body.items : [];
    const byBucket: Record<string, string[]> = {};
    for (const it of items) {
      if (!it?.bucket || !it?.path) continue;
      (byBucket[it.bucket] = byBucket[it.bucket] || []).push(it.path);
    }
    const results: Record<string, { removed: number; error?: string }> = {};
    for (const [bucket, paths] of Object.entries(byBucket)) {
      const { data, error } = await admin.storage.from(bucket).remove(paths);
      results[bucket] = { removed: data?.length ?? 0, error: error?.message };
    }
    return json({ ok: true, results });
  }

  // --- ADMIN: require authenticated admin user ---
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userRes, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userRes?.user) {
    return json({ error: "Unauthorized", detail: userErr?.message }, 401);
  }
  const userId = userRes.user.id;
  const { data: u } = await admin
    .from("users")
    .select("founder_admin,is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (!u || !((u as any).founder_admin || (u as any).is_admin)) {
    return json({ error: "Forbidden" }, 403);
  }

  try {
    if (action === "stats") {
      const buckets = Object.keys(BUCKET_REFS);
      const perBucket: Array<{ bucket: string; files: number; bytes: number }> = [];
      for (const b of buckets) {
        try {
          const objs = await listAllObjects(admin, b);
          perBucket.push({
            bucket: b,
            files: objs.length,
            bytes: objs.reduce((s, o) => s + o.size, 0),
          });
        } catch (e) {
          console.error(`list bucket ${b} failed:`, (e as Error).message);
          perBucket.push({ bucket: b, files: 0, bytes: 0 });
        }
      }
      const { data: dbStats, error: dbErr } = await userClient.rpc("get_storage_admin_db_stats");
      if (dbErr) {
        console.error("db stats rpc error:", dbErr);
      }
      return json({
        storage: perBucket,
        storage_total_bytes: perBucket.reduce((s, b) => s + b.bytes, 0),
        storage_total_files: perBucket.reduce((s, b) => s + b.files, 0),
        db: dbStats ?? { db_bytes: 0, tables: [] },
      });
    }

    if (action === "orphans") {
      const bucket = body.bucket as string;
      if (!bucket || !(bucket in BUCKET_REFS)) return json({ error: "bad bucket" }, 400);
      if (BUCKET_REFS[bucket].length === 0) {
        return json({ bucket, orphans: [], note: "Bucket has no tracked DB references." });
      }
      const objs = await listAllObjects(admin, bucket);
      const referenced = await getReferencedPaths(admin, bucket);
      const orphans = objs
        .filter((o) => !referenced.has(o.name))
        .map((o) => ({ path: o.name, bytes: o.size }));
      return json({
        bucket,
        orphans,
        total_orphan_bytes: orphans.reduce((s, o) => s + o.bytes, 0),
      });
    }

    if (action === "delete-orphans") {
      const bucket = body.bucket as string;
      const paths: string[] = Array.isArray(body.paths) ? body.paths : [];
      if (!bucket || paths.length === 0) return json({ error: "bad request" }, 400);
      // Re-verify each path is still an orphan to avoid TOCTOU
      const referenced = await getReferencedPaths(admin, bucket);
      const safe = paths.filter((p) => !referenced.has(p));
      const { data, error } = await admin.storage.from(bucket).remove(safe);
      if (error) throw error;
      return json({ ok: true, removed: data?.length ?? 0, skipped: paths.length - safe.length });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}