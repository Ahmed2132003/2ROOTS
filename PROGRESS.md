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

ملاحظة مهمة لـ Part A2: نظام المسوقين (`MarketerOrder`, `MarketerProductPrice`) بيربط مباشرة بـ `apps.products.Product` (المنتج الأساسي)، **مش** بـ `ProductVariant` — لأن خطة النظام (A System) ما ذكرتش variants، والتسعير للمسوق على مستوى المنتج ككل. هذا قرار موروث من Part A1 ولم يتغيّر في A2.

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
- **Frontend**: صفحة واحدة `pages/admin/Dashboard.jsx` تعرض Stats + إدارة Categories + Products. الـ navigation عبر Quick Links في الأعلى + Routes في `App.jsx`.
- **Pattern الجديدة يتبعه**: كل section جديد في الداشبورد = صفحة منفصلة في `pages/[domain]/`، Route في `App.jsx` تحت `<PrivateRoute roles={['admin', 'staff']}>`.

---

### Infrastructure

- **Celery**: مُعرَّف في settings (CELERY_BROKER_URL = Redis) لكن **لا يوجد `celery.py` app** في المشروع حالياً (جاهز للتفعيل). **القرار**: نستخدم Django management commands أولاً (كـ Part A3)، ونوضح كيفية الجدولة عبر cron.
- **Database**: PostgreSQL.
- **Timezone**: Africa/Cairo.
- **No Celery app yet**: سنُنشئ `backend/config/celery.py` لو احتجنا في مرحلة لاحقة.

---

## القرارات التقنية الثابتة

### 1. أسماء الـ Apps الجديدة

| App | المسار | يتضارب مع حاجة موجودة؟ |
|-----|--------|----------------------|
| Marketers | `apps/marketers` | ❌ لا تعارض |
| Wholesale | `apps/wholesale` | ❌ لا تعارض |
| Discounts | `apps/discounts` | ❌ لا تعارض |

### 2. Role "marketer" في User

تمت إضافة `('marketer', 'Marketer')` لـ `ROLE_CHOICES` في `apps/users/models.py` (منفذ في A1).
الـ `Marketer` model في `apps/marketers` OneToOne مع `User` حيث `user.role == 'marketer'`.

> **ملاحظة توضيح دقيقة (تُوثَّق هنا الآن، Part A2):**
> `User.role` يبقى `'marketer'` ثابت طول الوقت (مجرد تصنيف عام على مستوى الحساب).
> `Marketer.role` هو اللي يتغيّر بين `'marketer'` و `'team_leader'` (الحالة التفصيلية داخل نظام المسوقين فقط).
> الـ Permission class `IsMarketer` في `apps/marketers/permissions.py` بتفحص `User.role in ('marketer', 'team_leader')` تحسبًا، لكن عمليًا `User.role` يفضل `'marketer'` دائمًا حسب التصميم الحالي.
> **قرار يحتاج تأكيدك:** هل `User.role` نفسه يجب أن يتغير لـ `'team_leader'` عند الترقية، أم يكفي تغيير `Marketer.role` فقط (وهو الافتراض المعتمد الآن: لا نغيّر `User.role` أبدًا بعد الإنشاء)؟

### 3. MarketerOrder — موديل منفصل (قرار ثابت)

`MarketerOrder` موديل منفصل تماماً عن `Order` العادي لأن:
- مفيش Cart، مفيش دفع أونلاين، مفيش shipping address بالتفصيل
- المسوق هو اللي بيدخل بيانات العميل والسعر يدوياً
- لا علاقة له بـ `apps/invoices` أو `apps/cart`
- الـ snapshot المطلوب مختلف جوهرياً

### 4. ترتيب حساب السعر النهائي للأوردر (B + C)

```
السعر النهائي = (سعر الجملة المناسب للكمية) ثم يُطبق عليه الخصم
```

### 5. MarketerOrder والخصم (A + C)

نظام المسوقين **مستقل تماماً** عن Cart/Order العادي. الـ `MarketerOrder` لا يستخدم discount codes.

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
- **Files**: نفس pattern الموجود: `apps/[domain]/models.py`, `views.py`, `serializers.py`, `urls.py`, `signals.py`, `admin.py`

### 10. (جديد — Part A2) فصل urls.py عن dashboard_urls.py

لأن مسارات الأدمن (`/api/dashboard/marketer-orders/...`) **لا** تقع تحت `/api/dashboard/marketers/...` (الخطة الأصلية كتبت `marketer-orders` مباشرة تحت `/api/dashboard/`، مش متداخلة)، تم فصلهم لملفين:
- `apps/marketers/urls.py` → يُضمَّن تحت `path('api/marketers/', include(...))`
- `apps/marketers/dashboard_urls.py` → يُضمَّن تحت `path('api/dashboard/', include(...))`

**قرار يحتاج تأكيد**: لو فيه باترن مختلف بالفعل في `apps/orders` أو `apps/invoices` لربط مسارات `/api/dashboard/`، وحّد عليه بدل هذا الفصل (راجع كيف بيضيف `apps/invoices/urls.py` مساراته تحت dashboard فعليًا قبل أي Part جاي يعتمد على نفس الباترن).

### 11. (جديد — Part A2) Permission classes محلية

تم إنشاء `apps/marketers/permissions.py` بنسخة محلية من `IsAdminOrStaff` (نفس منطق `dashboard/views.py`) + `IsMarketer` جديدة. لم نستورد من `dashboard/views.py` مباشرة تجنبًا لـ circular imports محتملة ولعدم التأكد من شكل التصدير الفعلي هناك. **قرار يحتاج تأكيد**: لو `IsAdminOrStaff` مُصدَّرة بشكل صريح وقابلة لإعادة الاستخدام من `apps.dashboard.permissions` (أو مكان مشابه)، الأفضل نوحّد عليها بدل التكرار — عدّلها في أي Part جاي لو أكدت.

---

## سجل التقدم

---

### Part A1 — موديلز نظام المسوقين (النسخة المعدّلة)

*(دون تغيير — راجع النسخة السابقة لتفاصيل الموديلز والعلاقات والقرارات. بالملخص: 8 موديلز أساسية، `MarketerOrder` منفصل عن `Order`، حقل `counted_towards_leader` يُعبَّأ وقت `confirm`، `referral_code` بـ uuid4، `cycle_anchor_date` تلقائي وقت الإنشاء.)*

---

### Part A2 — تسجيل الأوردر اليدوي من المسوق + تأكيد/رفض الأدمن

**الملفات المُنشأة/المُحدَّثة:**

| الملف | الحالة | الغرض |
|-------|--------|-------|
| `apps/marketers/permissions.py` | جديد | `IsMarketer`, `IsAdminOrStaff` |
| `apps/marketers/serializers.py` | محدَّث | `MarketerOrderCreateSerializer`, `MarketerOrderSerializer` |
| `apps/marketers/views.py` | محدَّث | Create/List/Confirm/Reject views + counters logic |
| `apps/marketers/urls.py` | محدَّث | `me/orders/` |
| `apps/marketers/dashboard_urls.py` | **جديد** | مسارات الأدمن (راجع قرار #10 فوق) |
| `apps/marketers/tests.py` | محدَّث | 11 test cases |

**Endpoints المُنفَّذة:**

| Method | Path | الوصف | Permission |
|--------|------|-------|------------|
| POST | `/api/marketers/me/orders/` | المسوق يسجل أوردر | `IsMarketer` |
| GET | `/api/dashboard/marketer-orders/` | الأدمن يستعرض (فلتر status/marketer) | `IsAdminOrStaff` |
| PATCH | `/api/dashboard/marketer-orders/{id}/confirm/` | تأكيد + تحديث العدادات | `IsAdminOrStaff` |
| PATCH | `/api/dashboard/marketer-orders/{id}/reject/` | رفض (+ rollback لو كان مؤكَّد) | `IsAdminOrStaff` |

**منطق العدادات:**
- `_apply_counters(marketer, profit_amount, sign)` — دالة موحَّدة تُستخدم بـ `sign=+1` عند `confirm` وبـ `sign=-1` عند rollback، لضمان نفس المنطق بالاتجاهين بدون تكرار كود.
- `rollback_marketer_order_counters(order)` — **idempotent**: لو `order.is_counted == False` من الأساس، ما بتعملش حاجة. تُستخدم في `reject` (تتعامل مع حالتين: رفض pending عادي بدون أي تأثير، أو تراجع عن confirm سابق بعكس كل القيم).
- `confirm` على أوردر `confirmed` بالفعل → 400 (يمنع تكرار التحصيل بالخطأ).
- `reject` على أوردر `rejected` بالفعل → 400.
- كل الـ mutations داخل `transaction.atomic()` + `select_for_update()` على الـ `MarketerOrder` لمنع race conditions لو اتنين أدمن ضغطوا confirm بالتوقيت نفسه.

**القرارات المُتخذة في هذا الـ Part (تحتاج مراجعتك):**

1. **فصل `dashboard_urls.py`** عن `urls.py` — راجع قرار #10 فوق في "القرارات التقنية الثابتة".
2. **Permission classes محلية بدل الاستيراد من `dashboard`** — راجع قرار #11 فوق.
3. **توضيح `User.role` مقابل `Marketer.role`** — راجع قرار #2 المُحدَّث فوق، يحتاج تأكيدك صريح.
4. **`counted_towards_leader`** بيُحسب هنا فعليًا لأول مرة (كان مجرد حقل في الموديل من A1): لو `marketer.role == 'team_leader'` ياخد `credited_team_leader`، غير ذلك ياخد `team_leader` الحالي. هذا تطبيق مباشر لقرار A1 رقم 2، ولا يغيّره.

**اختبارات (`apps/marketers/tests.py`) — 11 حالة:**
تسجيل ناجح، رفض لعدم وجود سعر، validation الكمية/السعر، منع غير المسوق، تأكيد وتحديث العدادات، منع تأكيد مزدوج، رفض بعد تأكيد (rollback كامل)، رفض pending بدون تأكيد سابق، منع رفض مزدوج، قائمة الأدمن + فلترة status، منع غير الأدمن من الوصول لمسارات الداشبورد.

**أوامر التشغيل:**
```bash
python manage.py test apps.marketers
```
(لا توجد migrations جديدة في هذا الـ Part — كل التعديلات على طبقة الـ API فقط، الموديلز من A1 لم تتغيّر.)

**Patch مطلوب على `config/urls.py`:**
```python
path('api/marketers/', include('apps.marketers.urls')),
path('api/dashboard/', include('apps.marketers.dashboard_urls')),
```

**المطلوب في Part A3:**
- Management command `process_monthly_cycles.py` لتدوير الدورة الشهرية (30 يوم لكل مسوق على حدة) + التصفية الإجبارية لأي رصيد متبقي.
- التعامل مع حالة فوات أكثر من دورة واحدة (idempotent).

---

## ملاحظات مفتوحة تحتاج تأكيد صاحب المشروع

1. **خصم على منتجات محددة** (Part C1): الخصم على الجزء المنطبق فقط من الكارت، وليس الإجمالي الكلي؟
2. **Celery vs Cron**: هل سيُفعَّل Celery فعلياً على السيرفر أم نكتفي بـ cron job للـ management command؟
3. **(جديد) `User.role` مقابل `Marketer.role` عند الترقية لـ Leader** — راجع قرار #2 في "القرارات التقنية الثابتة". الافتراض الحالي: `User.role` لا يتغيّر أبدًا، فقط `Marketer.role`.
4. **(جديد) باترن `dashboard_urls.py`** — هل ده متّسق مع إزاي `apps/orders` و`apps/invoices` بالفعل بيربطوا مسارات `/api/dashboard/`؟ لو فيه باترن تاني فعلي في المشروع، وحّد عليه قبل Part A3 (هيكرر نفس الباترن).
5. **(جديد) `IsAdminOrStaff` محلية في `apps/marketers`** — لو فيها نسخة موحَّدة قابلة للاستيراد من `apps/dashboard`، استبدلها بدل التكرار.