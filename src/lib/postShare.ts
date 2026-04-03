const PUBLIC_DOMAIN = "https://bcsocial.org";

export function getPostUrl(postId: string) {
  return `${PUBLIC_DOMAIN}/post/${postId}`;
}

export function getPostShareUrl(postId: string) {
  // Uses /share/post/ path which Vercel proxies to the Supabase og-post edge function.
  // Bots get OG HTML; real users get redirected to the SPA post page.
  return `${PUBLIC_DOMAIN}/share/post/${postId}`;
}
