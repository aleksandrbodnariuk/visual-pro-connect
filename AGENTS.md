# Project architecture rules

- Paginate social feeds at the database boundary and fetch engagement data only for rendered posts, because large eager loads do not scale on mobile.
- Keep desktop admin navigation as tabs and use a single select control on mobile, because dozens of horizontally scrolling tabs are not discoverable.
- Wide admin datasets must scroll inside their own container or use mobile cards, because the page itself must never overflow horizontally.
- Keep feed engagement Realtime in one channel and refresh only the affected visible post or comment, because full-feed reloads multiply database traffic.