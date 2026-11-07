/** Built-in slides use relative Lovable asset paths that only resolve on the Lovable host; point them there from any domain. */
const ASSET_HOST = 'https://community-b-c.lovable.app';

export function resolveSlideUrl(url: string): string {
  if (url?.startsWith('/__l5e/')) return ASSET_HOST + url;
  return url;
}
