import { createClient } from "npm:@supabase/supabase-js@2";

// One-time transfer of the exact APK supplied by the owner. No caller-controlled URL or path.
Deno.serve(async () => {
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const response = await fetch("https://community-b-c.lovable.app/__l5e/assets-v1/3b7038b6-33a0-4771-8d7d-0b6bd90e994e/spilnota-bc.apk");
  const bytes = await response.arrayBuffer();
  if (!response.ok || bytes.byteLength !== 8080521 || new Uint8Array(bytes)[0] !== 80 || new Uint8Array(bytes)[1] !== 75) {
    return new Response("Invalid original APK", { status: 502 });
  }
  const { error } = await client.storage.from("android-releases").upload("system/initial-spilnota-bc.apk", bytes, { contentType: "application/vnd.android.package-archive", upsert: true, cacheControl: "60" });
  return Response.json({ transferred: !error, bytes: bytes.byteLength }, { status: error ? 500 : 200 });
});