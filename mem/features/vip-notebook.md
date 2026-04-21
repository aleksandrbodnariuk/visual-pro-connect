---
name: VIP Tools Hub (Stage 3 — Notebook + Calculator)
description: Хаб /vip/tools з ексклюзивними інструментами для VIP. Готові: приватний нотатник (/vip/notebook, з RLS) та розширений калькулятор (/vip/calculator, frontend-only). Плейсхолдер-картки «Незабаром» для нагадувань, планувальника, аналітики, mood board.
type: feature
---
**Концепція:** Етап 3 VIP-системи — ексклюзивні інструменти. Хаб `/vip/tools` об'єднує VIP-only утиліти. Перша — приватний нотатник.

**Маршрути:**
- `/vip/tools` — хаб VIP-інструментів (картки інструментів, gating для не-VIP)
- `/vip/notebook` — нотатник (grid карток, пошук, фільтр за тегами, CRUD)

**Модель даних:**
- `vip_notes` — id, user_id, title, content, color, is_pinned, tags (text[]), timestamps
- Індекси: `(user_id, is_pinned DESC, updated_at DESC)`, GIN на tags
- Тригер `set_vip_notes_updated_at` оновлює updated_at автоматично

**RLS (КЛЮЧОВЕ):**
- SELECT/INSERT/UPDATE/DELETE дозволено лише власнику з активним VIP (`has_active_vip(auth.uid())`) або адміну
- Якщо VIP закінчується — нотатки фізично залишаються в БД, але стають недоступними для читання/редагування. Відновлюються автоматично при поновленні VIP

**Хук:** `useVipNotes(userId)` — realtime через postgres_changes канал `vip-notes-${userId}`

**Компоненти:**
- `NoteCard` — компактна картка з кольором фону, pin-toggle, edit/delete
- `NoteEditorDialog` — модал для створення/редагування (заголовок 200, контент 20000, до 10 тегів, 6 кольорів)

**UI-обмеження:**
- Без VIP: показ paywall-картки з CTA на `/vip`
- 6 кольорів картки: default/amber/rose/emerald/sky/violet (всі через bg-{color}-500/15 + border)
- Закріплені нотатки завжди зверху (сортування is_pinned DESC, updated_at DESC)

**Інтеграція:** Кнопка «VIP-інструменти» додана в `/vip/moi` (header).

**Калькулятор (`/vip/calculator`):**
- 3 вкладки: Бюджет проєкту (статті витрат, накладні %, резерв %), ROI/маржа (дохід/витрати/години → прибуток, маржа, націнка, ROI, дохід/година), Податки (ФОП 1/2/3 без ПДВ, ФОП 3 з ПДВ, загальна система 18%+1.5%, комісія платформи)
- Frontend-only, без БД. Gating через `useUserVip` — не-VIP бачать paywall-картку
- Компоненти: `BudgetCalculator`, `RoiCalculator`, `TaxCalculator` у `src/components/vip/calculator/`

**Хаб /vip/tools:**
- Картки інструментів з типом `Tool { available: boolean }`
- Недоступні мають Badge «Незабаром» + disabled-кнопку
- Якщо немає VIP — кнопка «Потрібен VIP»
