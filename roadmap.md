# Roadmap

- [x] Diagnose profile post loading, mobile menu parity, and admin mobile overflow.
- [x] Paginate profile posts in batches of 10 and add «Показати ще».
- [x] Add Groups and Organizations to the mobile menu and align it with desktop navigation.
- [x] Replace the mobile admin tab strip with a compact section picker.
- [x] Make all admin tables, forms, and dialogs usable on mobile.
- [x] Verify mobile and desktop layouts, interactions, and current build status.
- [x] Verify the group feed continuation control specifically on mobile.
- [x] Keep the last group card and its «Відкрити» button above mobile navigation.
- [x] Replace full-feed Realtime reloads with targeted post and comment engagement refreshes.
- [x] Make post and comment reactions optimistic with rollback and Ukrainian errors.
- [x] Add feed query indexes for newest posts, group posts, and post comments.
- [ ] Verify signed-in feed and group reactions on desktop and mobile — blocked because this external authentication session is unavailable to the preview checker.
- [x] Review all current security and database warnings, classify real risks versus intentional settings, and safely fix everything possible without changing existing access behavior.
- [x] Restrict unnecessary execution rights on SECURITY DEFINER functions and verify every protected function has a safe `search_path`.
- [x] Re-run the security checker and document warnings that require Supabase Dashboard actions or should remain unchanged.- [x] Add mobile pull-to-refresh on the home feed with a gentle fade-in.
