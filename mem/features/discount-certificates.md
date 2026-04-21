---
name: Discount Certificates System
description: Платні та адмін-видавані сертифікати знижки на суму номіналу (UAH) з публічним бейджем, динамічними тарифами в БД та подарунками
type: feature
---
Платформа має систему сертифікатів знижок з ДВОМА шляхами видачі:
1) **Платний** — користувач купує через `/sertyfikaty` для себе або в подарунок
2) **Ручний** — адмін видає безкоштовно через адмін-таб «Сертифікати»

**КЛЮЧОВЕ ПРАВИЛО:** Сертифікат = знижка на СУМУ номіналу (НЕ відсоток). Тариф 500₴ → знижка 500₴ на послуги. Тип `discount_type='uah'`, `discount_value = amount_uah`.

**Модель даних:**
- `certificate_tiers` (динамічно редаговані адміном) — id, label, price_uah, description, perks (jsonb array), gradient, sort_order, is_active, highlight
- `user_certificates` (один на user_id) — `is_active`, `discount_type` ('uah' для покупок), `discount_value` (в ₴), `note`, `tier`, `purchased_by`, `is_gift`, `purchase_amount_uah`. При повторному апруві суми ДОДАЮТЬСЯ.
- `certificate_purchase_requests` — `buyer_id`, `recipient_id`, `is_gift`, `tier`, `amount_uah`, `discount_percent` (legacy=0), `status`, `buyer_note`, `admin_note`

**RPC (SECURITY DEFINER):**
- `approve_certificate_purchase(_request_id, _admin_note)` — створює сертифікат `discount_type='uah'`, `discount_value=amount_uah`. При існуючому активному uah-сертифікаті суми складаються (накопичення). Push-сповіщення.
- `reject_certificate_purchase(_request_id, _admin_note)` — відхиляє з нотифікацією

**RLS:** користувачі бачать свої заявки (як buyer/recipient). На `certificate_tiers` усі читають активні, адміни — повний доступ.

**UI:**
- `/sertyfikaty` — публічна вітрина (з БД через `useCertificateTiers`), показує «знижка {price}₴ на наші послуги»
- `/sertyfikaty/moi` — особистий кабінет
- Адмін-таб «Сертифікати» (3 секції): `PurchaseRequestsList` (заявки), `CertificateTiersEditor` (CRUD тарифів), ручне керування
- `<CertificateBadge>` — для type='uah' показує `{value}₴`, для 'percent' — `{value}%`

**Хуки:**
- `useCertificateTiers(activeOnly = true)` — реалтайм-завантаження з БД з fallback на хардкод
- `useUserCertificate(userId)` — реалтайм поточного сертифіката

**Бізнес-правила:**
- Без онлайн-оплати: заявка → адмін отримує оплату вручну → «Підтвердити»
- Один активний сертифікат на користувача; нова покупка додає суму
- Без терміну дії — деактивується лише вручну
- Адмін може CRUD тарифи в реальному часі без редеплою
