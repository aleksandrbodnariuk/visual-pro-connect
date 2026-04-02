const FALLBACK_PUBLIC_APP_URL = "https://community-b-c.lovable.app";

function getPublicAppOrigin() {
  if (typeof window === "undefined") {
    return FALLBACK_PUBLIC_APP_URL;
  }

  const { origin, hostname } = window.location;

  if (
    hostname.includes("id-preview--") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return FALLBACK_PUBLIC_APP_URL;
  }

  return origin;
}

export function getPostUrl(postId: string) {
  return `${getPublicAppOrigin()}/post/${postId}`;
}

export function getPostShareUrl(postId: string) {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "https://cxdkaxjeibqdmpvozirz.supabase.co").replace(/\/$/, "");
  const params = new URLSearchParams({
    id: postId,
    redirect: getPostUrl(postId),
  });

  return `${supabaseUrl}/functions/v1/og-post?${params.toString()}`;
}