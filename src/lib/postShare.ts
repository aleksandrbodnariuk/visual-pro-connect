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
  // Use the app's own domain with /share/post/ path.
  // On Vercel, this is proxied to the Supabase edge function via vercel.json rewrites,
  // avoiding Cloudflare bot-protection blocks (403) that occur when crawlers
  // hit Supabase domains directly.
  return `${getPublicAppOrigin()}/share/post/${postId}`;
}