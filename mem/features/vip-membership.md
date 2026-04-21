---
name: VIP / Premium Membership System
description: Платні VIP-рівні (Silver/Gold/Platinum) з соц-статусом + економічними бонусами (постійна знижка %, щомісячний бонус, подарунок на ДН). Сумісні зі знижковими сертифікатами.
type: feature
---
Платформа має систему VIP-членства з ДВОМА компонентами:

**Етап 1 — Соціальний статус:**
- VIP-бейдж біля аватара (Crown/Star/Gem іконки, glow-ефект)
- Анімований банер профілю (`shimmer`, `gold-shimmer`, `platinum-aurora` keyframes у `index.css`)
- Кастомний колір імені (HEX, налаштовується юзером після покупки)

**Етап 2 — Економічні переваги (КЛЮЧОВЕ ПРАВИЛО):**
VIP-знижка та сертифікати **СУМУЮТЬСЯ** — обидві переваги застосовуються разом до послуг.
- Постійна знижка % на послуги фахівців (Silver 10%, Gold 15%, Platinum 20%)
- Щомісячний бонус-сертифікат у ₴ (Silver 200₴, Gold 500₴, Platinum 1000₴) — раз на 30 днів
- Подарунок на день народження у ₴ (Silver 500₴, Gold 1000₴, Platinum 2000₴) — раз на рік у місяць ДН

Бонуси нараховуються на існуючий uah-сертифікат через накопичення (як у системі сертифікатів).

**Модель даних:**
- `vip_tiers` — id, label, price_uah, duration_days, perks (jsonb), gradient, badge_icon, name_color, banner_animation, highlight, **discount_percent, monthly_bonus_uah, birthday_bonus_uah**, sort_order, is_active. CRUD адміном через `VipTiersEditor`.
- `user_vip_memberships` — user_id (unique), tier, started_at, expires_at, is_lifetime, custom_name_color, custom_banner_url, **last_monthly_bonus_at, last_birthday_gift_year**.
- `vip_purchase_requests` — buyer_id, recipient_id, is_gift, tier, amount_uah, status, buyer_note, admin_note. Manual approval flow (як сертифікати).
- `users.date_of_birth` — додано для подарунку на ДН.

**RPC (SECURITY DEFINER):**
- `approve_vip_purchase(_request_id, _admin_note)` — створює/продовжує membership зі стекінгом тривалості
- `has_active_vip(_user_id)` — boolean
- `get_user_vip_tier(_user_id)` — text
- `get_vip_discount_percent(_user_id)` — numeric (0 якщо немає VIP)
- `claim_vip_monthly_bonus(_user_id)` — нараховує щомісячний бонус (раз на 30 днів), додає в активний uah-сертифікат
- `claim_vip_birthday_gift(_user_id)` — нараховує подарунок (раз на рік у місяць народження)

**RLS:** усі читають активні `vip_tiers`; користувачі бачать лише свої заявки/membership; адміни — повний доступ.

**UI:**
- `/vip` — публічна вітрина тарифів (з показом discount %, monthly, birthday бонусів)
- `/vip/moi` — особистий кабінет (статус, термін дії, кастомний колір, `<VipBenefitsCard>` з кнопками claim для бонусів)
- Адмін-таб «VIP» (3 секції): `VipPurchaseRequestsList`, `VipTiersEditor` (з полями знижок/бонусів), `VipManualGrant`
- `<VipBadge>`, `<VipAnimatedBanner>` — інтегровані в `ProfileHeader.tsx`
- `/sertyfikaty/moi` — показує блок з активною VIP-знижкою біля сертифіката (підкреслює сумування)
- `ProfileEditor` — поле «Дата народження» (потрібно для claim_vip_birthday_gift)

**Хуки:**
- `useVipTiers(activeOnly)` — реалтайм-завантаження тарифів
- `useUserVip(userId)` — поточне активне membership
- `useVipBenefits(userId)` — обчислює доступність бонусів (monthlyAvailable, birthdayAvailable, isBirthMonth)

**Бізнес-правила:**
- Без онлайн-оплати: заявка → адмін «Підтвердити» → membership активний
- Покупка існуючого тарифу = додавання тривалості до expires_at (стекінг)
- Бонуси = накопичуються в активному uah-сертифікаті (один на користувача)
- Подарунок на ДН доступний лише якщо вказано date_of_birth і поточний місяць = місяць народження
