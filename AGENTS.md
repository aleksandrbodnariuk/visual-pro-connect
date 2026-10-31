# Project architecture rules

- Paginate social feeds at the database boundary and fetch engagement data only for rendered posts, because large eager loads do not scale on mobile.
- Keep desktop admin navigation as tabs and use a single select control on mobile, because dozens of horizontally scrolling tabs are not discoverable.
- Wide admin datasets must scroll inside their own container or use mobile cards, because the page itself must never overflow horizontally.
- Keep feed engagement Realtime in one channel and refresh only the affected visible post or comment, because full-feed reloads multiply database traffic.
- Lock every SECURITY DEFINER function to a fixed search path, minimal EXECUTE roles, and internal authorization for sensitive work, because grants alone are fragile.
- Rank daily highlighted posts in a bounded SECURITY INVOKER query using existing post RLS and actual reaction rows, because client-side ranking of a partial feed is inaccurate and bypassing access policies is unsafe.- Feed sponsored ads live in their own tables with admin-only approval enforced by a database trigger and are kept separate from the referral ad-order finances, because client checks can be bypassed and mixing them would corrupt payout logic.
- Test and training election campaigns reuse real precincts via a campaign mode and participant list, so deleting them removes only campaign protocols and never the real structure.

- Election simulation (demo/training) only writes input reports and protocols as the system observer; all totals come from the regular counting functions, so demo data exercises the real pipeline.
- Election board counters use independent recorded milestones in every campaign mode; tile colours and stacked bars use the exclusive current status, because later stages must not erase earlier counts or make stacked bars exceed 100%.
- Election screens load precincts by role scope (admin: all, HQ manager: own subtree, observer: only assigned precincts) via `resolvePrecinctScope`, because loading every national precinct on phones does not scale.
- Admin tabs and chart-heavy panels are lazy-loaded with a Suspense fallback, because eager imports made the admin chunk exceed 1 MB.

- Portfolio audio always plays `media_url`; preview/display columns hold optional cover images, and both public portfolio views share one active music player, because artwork must never replace the playable source.
- Personal friend lists (friend_lists + friend_list_members) are owner-only via RLS and many-to-many, because tags are private and one friend may belong to several lists.
