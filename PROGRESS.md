# أنظمة المسوقين + الجملة + أكواد الخصم — 2ROOTS

---

## الفهم الحالي للمشروع

### Auth & Users (`apps/users`)

| الموديل | الغرض |
|---------|-------|
| `User` (AbstractUser) | Custom user بـ `role` field: `admin` / `staff` / `customer` / `marketer`. الـ `USERNAME_FIELD` هو `email`. |
| `CustomerProfile` | OneToOne مع User، بيانات إضافية للعملاء فقط (صورة، تاريخ ميلاد). |
| `CustomerAccount` | موديل مستقل (مش FK لـ User) — يمثل "عميل" بناءً على اسم+إيميل+تليفون، بيتبنى أوتوماتيك من الأوردرات. مش شرط يكون عنده حساب على الموقع. |

**Permission pattern**: `IsAdminOrStaff` class في `dashboard/views.py` بتتحقق من `user.role in ['admin', 'staff']`. في `apps/marketers` تم تكرار نفس المنطق محليًا في `permissions.py` (راجع تقرير Part A2 لسبب القرار).

**Auth**: JWT عبر `rest_framework_simplejwt`.

---

### Products (`apps/products`)

| الموديل | الملاحظات |
|---------|-----------|
| `Category` | شجرة (self FK لـ parent)، slug تلقائي. |
| `Product` | `base_price` (Decimal)، نظام خصم مدمج (`discount_type`: percentage/fixed، `discount_active`، `discount_start/end`). |
| `ProductVariant` | FK لـ Product، `price_override` (nullable — لو null يورث `base_price`). `effective_price` property بتحسب السعر بعد الخصم. |
| `Stock` | OneToOne مع ProductVariant، `quantity`. |
| `ProductImage` | FK لـ Product، `is_primary`. |
| `ProductColor`, `ProductSize` | جداول مستقلة. |

**كيف السعر بيتحسب حالياً**: `CartItem.subtotal = variant.effective_price × quantity`. الـ `effective_price` على `ProductVariant` بيطبق خصم المنتج على `price_override` أو `base_price`. **لا يوجد wholesale tiering حالياً**.

ملاحظة مهمة لـ Part A2: نظام المسوقين (`MarketerOrder`, `MarketerProductPrice`) بيربط مباشرة بـ `apps.products.Product` (المنتج الأساسي)، **مش** بـ `ProductVariant`.

---

### Cart (`apps/cart`)

| الموديل | الملاحظات |
|---------|-----------|
| `Cart` | OneToOne مع User (أو session_key للـ guests). |
| `CartItem` | FK لـ Cart + FK لـ ProductVariant. `unique_together = ['cart', 'variant']`. `subtotal = variant.effective_price × quantity`. |

**لا يوجد `applied_discount_code` على Cart حالياً** — هنضيف حقل في Part C2.

---

### Orders (`apps/orders`)

| الموديل | الملاحظات |
|---------|-----------|
| `Order` | FK لـ User + FK لـ CustomerAccount (nullable). Snapshot لبيانات الشحن. `total` = items_total + shipping_fee. Status: pending/confirmed/shipped/delivered/cancelled. |
| `OrderItem` | Snapshot من المنتج وقت الشراء (`price_at_order`, `product_name`, `variant_name`). |
| `OrderStatusHistory` | سجل كل تغيير في الـ status. |
| `ShippingRegion` | جدول مناطق الشحن بأسعارها. |

**لا يوجد `discount_amount` على Order حالياً** — هنضيف في Part C2.

---

### Dashboard (`apps/dashboard`)

- **Backend**: 3 views فقط (Stats، SalesChart، TopProducts). كلهم بـ `IsAdminOrStaff` permission.
- **Frontend**: صفحة واحدة `pages/admin/Dashboard.jsx` تعرض Stats + إدارة Categories + Products.
- **Pattern الجديدة يتبعه**: كل section جديد في الداشبورد = صفحة منفصلة في `pages/[domain]/`، Route في `App.jsx` تحت `<PrivateRoute roles={['admin', 'staff']}>`.

---

### Infrastructure

- **Celery**: مُعرَّف في settings (`CELERY_BROKER_URL`/`CELERY_RESULT_BACKEND` = Redis) لكن **لا يوجد `celery.py` app** في المشروع حالياً. **القرار**: نستخدم Django management commands أولاً (Part A3)، ونوضح طريقة الجدولة عبر cron.
- **Database**: PostgreSQL.
- **Timezone**: `Africa/Cairo`, `USE_TZ = True`.

---

## القرارات التقنية الثابتة

### 1. أسماء الـ Apps الجديدة

| App | المسار | يتضارب مع حاجة موجودة؟ |
|-----|--------|----------------------|
| Marketers | `apps/marketers` | ❌ لا تعارض |
| Wholesale | `apps/wholesale` | ❌ لا تعارض |
| Discounts | `apps/discounts` | ❌ لا تعارض |

### 2. Role "marketer" في User

`Marketer` model في `apps/marketers` OneToOne مع `User` حيث `user.role == 'marketer'`. `User.role` ثابت طول الوقت؛ `Marketer.role` هو اللي يتغيّر بين `'marketer'` و `'team_leader'`.

> **قرار يحتاج تأكيدك:** هل `User.role` نفسه يجب أن يتغير لـ `'team_leader'` عند الترقية، أم يكفي تغيير `Marketer.role` فقط (الافتراض الحالي: `User.role` لا يتغيّر أبدًا)؟

### 3. MarketerOrder — موديل منفصل (قرار ثابت)

`MarketerOrder` موديل منفصل تماماً عن `Order` العادي (مفيش Cart، مفيش دفع أونلاين، المسوق بيدخل بيانات العميل والسعر يدوياً، لا علاقة بـ invoices/cart).

### 4. ترتيب حساب السعر النهائي للأوردر (B + C)

```
السعر النهائي = (سعر الجملة المناسب للكمية) ثم يُطبق عليه الخصم
```

### 5. MarketerOrder والخصم (A + C)

نظام المسوقين **مستقل تماماً** عن Cart/Order العادي. `MarketerOrder` لا يستخدم discount codes.

### 6. طلب سحب الأرباح (Part A6)

الرصيد يُخصم/يُحجز فوراً عند تقديم الطلب. لو الأدمن رفض الطلب، يرجع الرصيد.

### 7. خصم الـ Discount Code على منتجات محددة (Part C1)

يحتاج تأكيد من صاحب المشروع — موضّح في تقرير Part C1 (لسه لم يُنفَّذ).

### 8. Constants في settings.py

```python
MARKETER_MONTHLY_TARGET_ORDERS = 10
MARKETER_MIN_TEAM_MEMBERS = 10
MARKETER_CYCLE_DAYS = 30
```

### 9. Convention التسمية

- **Backend**: snake_case للـ models والـ fields، PascalCase للـ classes
- **Frontend**: PascalCase للـ components، camelCase للـ functions
- **APIs**: `/api/marketers/...` للمسوق، `/api/dashboard/...` للأدمن

### 10. فصل urls.py عن dashboard_urls.py (Part A2)

- `apps/marketers/urls.py` → تحت `path('api/marketers/', include(...))`
- `apps/marketers/dashboard_urls.py` → تحت `path('api/dashboard/', include(...))`

**قرار يحتاج تأكيد**: وحّد مع باترن `apps/orders`/`apps/invoices` لو فيه فرق فعلي.

### 11. Permission classes محلية (Part A2)

`apps/marketers/permissions.py` بنسخة محلية من `IsAdminOrStaff` بدل الاستيراد من `dashboard`. **قرار يحتاج تأكيد**: وحّد لو فيه نسخة موحَّدة قابلة لإعادة الاستخدام.

### 12. (جديد — Part A3) التصفية الإجبارية الشهرية: حقل `is_forced_settlement` على `WithdrawalRequest`

القرار المعلّق في الخطة الأصلية ("موديل ForcedSettlement منفصل وللا نفس WithdrawalRequest") اتحسم لصالح **نفس `WithdrawalRequest`** + حقل جديد `is_forced_settlement` (Boolean, default=False). السبب: سجل واحد موحَّد لكل "الفلوس اللي خرجت من الرصيد الشهري" أسهل في التقارير لاحقًا (مجموع كل `WithdrawalRequest` بحالة `paid` = إجمالي المدفوع، سواء كان طلب من المسوق نفسه أو تصفية تلقائية)، والـ flag كافي للتفريق بينهم في الداشبورد. **هذا قرار اتخذته في A3، مش جزء من الخطة الأصلية المكتوبة، ومحتاج تأكيدك الصريح قبل البدء في Part A4** — يتطلب تعديل يدوي بسيط على `models.py` + migration (راجع `MODELS_PATCH_NOTE.md` وتقرير A3 تحت).

---

## سجل التقدم

---

### Part A1 — موديلز نظام المسوقين

8 موديلز: `Marketer`, `MarketerProductPrice`, `MarketerOrder`, `RewardTier`, `TeamReward`, `TeamLeaderRequest`, `TeamLeaderRequestMember`, `WithdrawalRequest`. نقاط مهمة من الكود الفعلي:
- `Marketer.cycle_anchor_date` هو **`DateField`** (مش DateTimeField)، بيتحدد تلقائيًا في `save()` لـ `timezone.localdate()` بس لو مفيش قيمة متبعتة وقت الإنشاء.
- `Marketer` فيها methods جاهزة: `get_cycle_start(cycle_number=None)` و `get_cycle_end(cycle_number=None)` بترجع `date` (مش datetime) بتاع بداية/نهاية أي دورة، بناءً على `MARKETER_CYCLE_DAYS` من settings. **أي كود جديد يحسب حدود الدورة لازم يستخدم الـ methods دي بدل ما يعيد كتابة المنطق.**
- `MarketerOrder.counted_towards_leader`: FK لـ Marketer، بيتعبى وقت `confirm` (راجع Part A2).
- `referral_code` بـ uuid4 hex[:8].upper().

---

### Part A2 — تسجيل الأوردر اليدوي من المسوق + تأكيد/رفض الأدمن

**Endpoints:**

| Method | Path | الوصف | Permission |
|--------|------|-------|------------|
| POST | `/api/marketers/me/orders/` | المسوق يسجل أوردر | `IsMarketer` |
| GET | `/api/dashboard/marketer-orders/` | الأدمن يستعرض (فلتر status/marketer) | `IsAdminOrStaff` |
| PATCH | `/api/dashboard/marketer-orders/{id}/confirm/` | تأكيد + تحديث العدادات | `IsAdminOrStaff` |
| PATCH | `/api/dashboard/marketer-orders/{id}/reject/` | رفض (+ rollback لو كان مؤكَّد) | `IsAdminOrStaff` |

**منطق العدادات:** `_apply_counters(marketer, profit_amount, sign)` موحَّدة لـ confirm (+1) ولـ rollback (-1). `confirm`/`reject` على أوردر في نفس الحالة بالفعل → 400. كل الـ mutations جوه `transaction.atomic()` + `select_for_update()`.

**اختبارات (`tests.py`, class `MarketerOrderFlowTests`) — 11 حالة.**

---

### Part A3 — الدورة الشهرية (30 يوم لكل حساب) + التصفية الإجبارية

**الملفات:**

| الملف | الحالة | الغرض |
|---|---|---|
| `apps/marketers/models.py` | **تعديل مطلوب منك** (patch جاهز في `MODELS_PATCH_NOTE.md`) | إضافة `is_forced_settlement` لـ `WithdrawalRequest` |
| `apps/marketers/management/__init__.py` | جديد (فاضي) | تفعيل management commands للـ app |
| `apps/marketers/management/commands/__init__.py` | جديد (فاضي) | — |
| `apps/marketers/management/commands/process_monthly_cycles.py` | جديد | الكوماند الرئيسي |
| `apps/marketers/tests.py` | إضافة class `ProcessMonthlyCyclesCommandTests` (6 حالات) | تغطية الكوماند |

**القرار اللي كان معلّق (⚠️) واتحسم هنا — راجع قرار #12 فوق.**

**منطق الكوماند:**
- بيستخدم `marketer.get_cycle_end()` الموجودة بالفعل على الموديل من A1 (مش بيعيد حساب التاريخ) — مقارنة `timezone.localdate()` (date) ضد `get_cycle_end()` (date)، مش `timezone.now()`، لأن `cycle_anchor_date` نفسه `DateField`.
- لكل `Marketer`: `transaction.atomic()` + `select_for_update()` منفصلة (مش transaction واحدة للباتش كله) — قفل صف واحد ميعطلش الباقي، وفشل مسوق واحد ميرجعش تغييرات غيره.
- `while today >= marketer.get_cycle_end():` بدل `if` — يتعامل صح مع فوات أكتر من دورة واحدة، بيقفل كل دورة على حدة بالترتيب.
- **Idempotency طبيعية بدون أي flag إضافي**: الشرط بيعتمد على `current_cycle_number` نفسه (جزء من الداتا)، فتشغيل الكوماند أي عدد مرات بعد ما الدورة اتقفلت، الشرط بيبقى False من المرة التانية.
- لكل دورة بتتقفل: لو `monthly_profit_balance > 0` → `WithdrawalRequest` جديد بـ `status="paid"`, `is_forced_settlement=True`, `cycle_number` = رقم الدورة اللي اتقفلت (قبل الزيادة), `resolved_at=timezone.now()`. بعدين تصفير `monthly_profit_balance` و `monthly_completed_orders_count`، وزيادة `current_cycle_number`.
- `lifetime_total_orders` و `lifetime_total_profit` **متتلمسش خالص**.
- `--dry-run` (إضافة عملية مش في الخطة الأصلية، مفيدة لتجربة الكوماند على بيانات حقيقية قبل ما تثق فيه) — بيطبع اللي هيحصل من غير حفظ.
- ملخص آخر التشغيلة في stdout (عدد المسوقين المتأثرين، عدد الدورات المُقفلة، عدد التصفيات وقيمتها) — مفيد للمونيتورينج لو السطر بيتسجل في log من cron.

**الاختبارات (`ProcessMonthlyCyclesCommandTests`, 6 حالات):**
1. دورة لسه ماخلصتش (10 من 30 يوم) → مفيش تغيير.
2. دورة خلصت بدون رصيد → تصفير + زيادة `current_cycle_number` بدون `WithdrawalRequest`.
3. دورة خلصت برصيد → `WithdrawalRequest` بـ `is_forced_settlement=True`, `status="paid"`, القيمة والـ `cycle_number` صحيحين، الأرقام التراكمية ثابتة.
4. فوات 3 دورات (95 يوم) برصيد في الأول بس → `current_cycle_number` يزيد بـ3، تصفية واحدة بس.
5. تشغيل الكوماند مرتين على نفس المسوق → نفس نتيجة المرة الواحدة بالظبط.
6. `--dry-run` → صفر تغييرات محفوظة.

**Backdating في الاختبارات**: بما إن `Marketer.save()` بيحدد `cycle_anchor_date` تلقائيًا بس لو القيمة فاضية وقت الإنشاء، تمرير `cycle_anchor_date` بتاريخ ماضي مباشرة في `.create()` كافي لمحاكاة حساب قديم — مفيش حاجة لـ mock للوقت.

**طريقة الجدولة المتوقعة على السيرفر:**
بما إن Celery مش مفعّل فعليًا لسه، الكوماند مصمم يتشغّل **يوميًا** عبر cron خارجي:
```cron
0 3 * * * cd /path/to/2ROOTS/backend && /path/to/venv/bin/python manage.py process_monthly_cycles >> /var/log/2roots/monthly_cycles.log 2>&1
```
يومي (مش شهري) لازم تحديدًا لأن كل مسوق له `cycle_anchor_date` مختلف (تاريخ تسجيله هو، مش أول الشهر الميلادي)، فلازم نفحص كل يوم مين وصل لآخر دورته بالظبط. لو Celery اتفعّل لاحقًا، سهل التحويل لـ `celery beat` schedule يومي بينادي نفس الكوماند.

**قرارات تحتاج تأكيدك قبل Part A4:**
- إضافة `is_forced_settlement` لـ `WithdrawalRequest` (قرار #12) — موافق عليه؟ (التعديل + الـ migration لسه ما اتعملوش — لازم تعمل `makemigrations` بنفسك بعد تطبيق الـ patch).
- نفس مبدأ `select_for_update()` المستخدم هنا لازم يتطبّق في Part A6 (طلب السحب) على نفس صف الـ `Marketer`، عشان التصفية الإجبارية وطلب السحب اليدوي ميتصادموش على نفس الرصيد في نفس اللحظة — هفكّرك بيه لما نوصل A6.

**المطلوب في Part A4:**
طلب الترقية لـ Leader Team (بالسؤال عند تحقيق التارجت + شرط الـ10 مسوقين) + الترقية اليدوية الكاملة من الأدمن.

---

## ملاحظات مفتوحة تحتاج تأكيد صاحب المشروع

1. **خصم على منتجات محددة** (Part C1): الخصم على الجزء المنطبق فقط من الكارت، وليس الإجمالي الكلي؟
2. **Celery vs Cron**: هل سيُفعَّل Celery فعلياً على السيرفر أم نكتفي بـ cron job؟
3. **`User.role` مقابل `Marketer.role` عند الترقية** — راجع قرار #2.
4. **باترن `dashboard_urls.py`** — هل متّسق مع `apps/orders`/`apps/invoices`؟
5. **`IsAdminOrStaff` محلية في `apps/marketers`** — وحّدها لو فيه نسخة مشتركة.
6. **(جديد — Part A3) `is_forced_settlement` على `WithdrawalRequest`** — قرار يحتاج موافقتك + تطبيق الـ patch + migration بنفسك قبل Part A4.