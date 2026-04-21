---
name: Discount Certificates System
description: Платні та адмін-видавані сертифікати знижки на послуги фото/відео/музика з публічним бейджем, заявками та подарунками
type: feature
---
Платформа має систему сертифікатів знижок для послуг фото/відео/музика з ДВОМА шляхами видачі:
1) **Платний** — користувач купує через `/sertyfikaty` (3 тарифи: 500₴/5%, 1500₴/10%, 3000₴/15%) для себе або в подарунок
2) **Ручний** — адмін видає безкоштовно через адмін-таб «Сертифікати»

**Модель даних:**
- `user_certificates` (один на user_id) — `is_active`, `discount_type` ('fixed'|'percent'|'uah'), `discount_value`, `note`, `tier`, `purchased_by`, `is_gift`, `purchase_amount_uah`
- `certificate_purchase_requests` — заявки покупців: `buyer_id`, `recipient_id`, `is_gift`, `tier`, `amount_uah`, `discount_percent`, `status` (pending/approved/rejected/cancelled), `buyer_note`, `admin_note`

**RPC (SECURITY DEFINER):**
- `approve_certificate_purchase(_request_id, _admin_note)` — атомарно створює/оновлює сертифікат (ON CONFLICT user_id), відправляє push-сповіщення отримувачу та покупцю (для подарунків)
- `reject_certificate_purchase(_request_id, _admin_note)` — відхиляє з нотифікацією покупцю

**RLS:** користувачі бачать свої заявки (як buyer або recipient), створюють/скасовують власні pending; адмін має повний доступ. На `user_certificates` усі автентифіковані можуть читати.

**UI:**
- `/sertyfikaty` — публічна вітрина 3 тарифів з модалкою купівлі (Tabs: «Для себе» / «В подарунок» з пошуком отримувача за імʼям/телефоном)
- `/sertyfikaty/moi` — особистий кабінет: активний сертифікат + історія заявок + кнопка скасування pending
- Sidebar: пункт «Сертифікати» з іконкою Award (text-amber-500) між Settings та панеллю акціонера
- Адмін-таб «Сертифікати»: зверху `PurchaseRequestsList` (pending з кнопками Підтвердити/Відхилити + realtime), знизу — ручне керування
- `<CertificateBadge userId certificate?>` — золотий бейдж біля аватара (sizes: sm/md/lg), розміщується absolute -bottom-1 -right-1
- Realtime-підписки: на `user_certificates` (для бейджа) і на `certificate_purchase_requests` (для адмінського списку)

**Бізнес-правила:**
- Без онлайн-оплати на старті: користувач створює заявку → адмін звʼязується → отримує оплату вручну (карта/IBAN) → натискає «Підтвердити»
- Один активний сертифікат на користувача (при апруві нової заявки оновлюється з GREATEST discount_value)
- Подарункові сертифікати: отримувач отримує push «🎁 Вам подарували сертифікат», покупець — підтвердження
- Без терміну дії — деактивується лише вручну адміном