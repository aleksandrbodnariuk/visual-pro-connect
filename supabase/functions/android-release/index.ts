import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data, error } = await client.from("site_settings").select("value").eq("id", "android-apk-path").maybeSingle();
  const path = data?.value;
  if (error || !path || !/^[a-zA-Z0-9-]+\/android\/[a-zA-Z0-9-]+\.apk$/.test(path) && path !== "system/initial-spilnota-bc.apk") {
    return new Response("Android release unavailable", { status: 404, headers: cors });
  }
  const { data: signed, error: signError } = await client.storage.from("android-releases").createSignedUrl(path, 300, { download: "spilnota-bc.apk" });
  if (signError || !signed) return new Response("Download unavailable", { status: 503, headers: cors });
  return new Response(null, { status: 302, headers: { ...cors, Location: signed.signedUrl, "Cache-Control": "no-store" } });
});