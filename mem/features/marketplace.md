---
name: marketplace
description: Універсальний маркетплейс «як OLX» для креативів — продаж/оренда/послуги/цифрові товари з обраним та резервуванням через чат
type: feature
---

Універсальний маркетплейс на маршруті `/market` для всіх типів оголошень: послуги, цифрові товари, техніка, оренда обладнання. Усі авторизовані користувачі можуть подавати оголошення безкоштовно.

**Сторінки:**
- `/market` — стрічка з категоріями, фільтрами (пошук, ціна, стан, місто, тип угоди) та сортуванням
- `/market/:id` — деталі оголошення, контакт через чат, кнопка резервування
- `/market/new` — створення оголошення (до 8 фото, ліміт 5МБ кожне)
- `/market/moi` — мої оголошення (Активні / Продані / Архів)
- `/market/favorites` — обране (серце)

**Таблиці БД:**
- `marketplace_categories` (id text PK, parent_id, label, icon, sort_order, is_visible)
- `marketplace_listings` (status: draft/active/reserved/sold/archived; deal_type: sale/rent/service/digital; condition: new/used/for_rent/service)
- `marketplace_listing_images` (до 8 на оголошення, is_cover для обкладинки)
- `marketplace_favorites` (унікальна пара user_id+listing_id)
- `marketplace_reservations` (статуси: pending/accepted/rejected/completed/cancelled)

**Storage:** бакет `marketplace` (публічний), шлях `<user_id>/<timestamp>-<idx>.<ext>`. RLS дозволяє завантаження лише у власну папку.

**Доступ (RLS):** усі бачать оголошення зі статусом active/reserved/sold; власник бачить свої будь-якого статусу; редагує/видаляє лише власник або адмін. Обране — приватне. Резервування — бачать покупець і продавець.

**Інтеграція з чатом:** кнопка «Написати продавцю» переходить на `/messages?to=<seller_id>&topic=<title>` (використовує існуючу систему conversations/messages, окремої таблиці не створено).

**VIP-бейдж:** поле `is_vip_boost` на оголошенні дає золотий бейдж і пріоритет у сортуванні (на цьому етапі — лише візуально, авто-логіка боусту не реалізована).

**Лічильник переглядів:** інкрементується при відкритті деталей через хук `useMarketplaceListing`.

**Trigger function:** `set_marketplace_updated_at()` — окрема локальна функція для оновлення `updated_at` (не залежить від `update_updated_at_column`, якої немає в проєкті).

**Категорії за замовчуванням:** Послуги (Briefcase), Цифрові товари (Download), Техніка та обладнання (Camera), Оренда обладнання (Package).

**Етап 2 — Поглиблений пошук:** Хук `useMarketplaceListings` викликає RPC `search_marketplace_listings` (security definer, plpgsql). Функція використовує `websearch_to_tsquery('simple', ...)` з ранжуванням `ts_rank` по полях `title + description`. VIP-бустинг завжди в пріоритеті, далі релевантність, потім обраний `sortBy`. Зображення підвантажуються другим запитом і мапляться в клієнті, щоб не ускладнювати RPC. У `MarketplaceFilters` додано рядок чіпів для типу угоди (Усі/Продаж/Оренда/Послуги/Цифрові) та чіп «Популярні» для миттєвого перемикання сортування.

**Етап 3 — Резервування:** Хук `useMarketplaceReservations` (`useIncomingReservations`, `useOutgoingReservations`, `useMyReservationForListing`, `useCreateReservation`, `useUpdateReservation`) керує всім життєвим циклом. На сторінці деталей оголошення кнопка «Зарезервувати» відкриває `ReserveDialog` з опційним повідомленням (до 500 символів). Якщо у покупця вже є активний запит — кнопка ховається й показується картка статусу + дія «Скасувати». У `MarketplaceMine` додано вкладки «Запити на резервування» (incoming, з бейджем pending-кількості) та «Мої резервування» (outgoing) — компонент `ReservationsList`. При підтвердженні продавцем статус оголошення авто-перемикається на `reserved`, при `completed` → `sold`, при `rejected/cancelled` повертається в `active` (якщо немає інших accepted). Кнопка «Чат» у картці резервації одразу веде у `/messages?to=...&topic=Резервування: ...`.

**Етап 4 — VIP-бустинг:** Доступ до `is_vip_boost` обмежений власникам активного VIP-членства (хук `useUserVip`). Компонент `VipBoostToggle` показує перемикач для VIP-користувачів і промо-блок із посиланням на `/vip` для решти. Інтегрований у `MarketplaceNew` (опція при створенні), на сторінку деталей оголошення (керування власником) і у `MyListingCard` (швидкий перемикач у сітці «Мої оголошення»). Хук `useToggleVipBoost` оновлює флаг та інвалідує кеш. Візуально VIP-картки виділяються золотим кільцем `ring-amber-500/40`, тіньовим золотим glow і градієнтним бейджем `bg-gradient-to-r from-amber-500 to-amber-600` з іконкою корони. Золотий — фірмовий VIP-колір проекту (узгоджено з VIP-системою), не темо-залежний. Сортування з пріоритетом VIP вже реалізовано в RPC `search_marketplace_listings` на етапі 2.