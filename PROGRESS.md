# أنظمة المسوقين + الجملة + أكواد الخصم — 2ROOTS

---

## الفهم الحالي للمشروع

### Auth & Users (`apps/users`)

| الموديل | الغرض |
|---------|-------|
| `User` (AbstractUser) | Custom user بـ `role` field: `admin` / `staff` / `customer`. الـ `USERNAME_FIELD` هو `email`. لا يوجد `marketer` في الـ roles الحالية — هنضيفها. |
| `CustomerProfile` | OneToOne مع User، بيانات إضافية للعملاء فقط (صورة، تاريخ ميلاد). |
| `CustomerAccount` | موديل مستقل (مش FK لـ User) — يمثل "عميل" بناءً على اسم+إيميل+تليفون، بيتبنى أوتوماتيك من الأوردرات. مش شرط يكون عنده حساب على الموقع. |

**Permission pattern**: `IsAdminOrStaff` class في `dashboard/views.py` بتتحقق من `user.role in ['admin', 'staff']` — هنتبع نفس الباترن ده في الـ apps الجديدة.

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

سنضيف `marketer` لـ `ROLE_CHOICES` في `apps/users/models.py`:
```
('marketer', 'Marketer'),
```
الـ `Marketer` model في `apps/marketers` سيكون OneToOne مع `User` حيث `user.role == 'marketer'`.

### 3. MarketerOrder — موديل منفصل (قرار ثابت)

`MarketerOrder` سيكون موديلاً منفصلاً تماماً عن `Order` العادي لأن:
- مفيش Cart، مفيش دفع أونلاين، مفيش shipping address بالتفصيل
- المسوق هو اللي بيدخل بيانات العميل والسعر يدوياً
- لا علاقة له بـ `apps/invoices` أو `apps/cart`
- الـ snapshot المطلوب مختلف جوهرياً

### 4. ترتيب حساب السعر النهائي للأوردر (B + C)

```
السعر النهائي = (سعر الجملة المناسب للكمية) ثم يُطبق عليه الخصم
```
أي:
1. `unit_price = Product.get_price_for_quantity(quantity)` — يأخذ wholesale tier لو موجود
2. `subtotal = unit_price × quantity`
3. `discount_amount` يُحسب على إجمالي الكارت (أو الجزء المنطبق عليه)
4. `order_total = subtotal_after_wholesale - discount_amount + shipping_fee`

### 5. MarketerOrder والخصم (A + C)

نظام المسوقين **مستقل تماماً** عن Cart/Order العادي. الـ `MarketerOrder` لا يستخدم discount codes — المسوق بيدخل السعر اللي باع بيه مباشرة.

### 6. طلب سحب الأرباح (Part A6)

الرصيد يُخصم/يُحجز فوراً عند تقديم الطلب (لمنع طلب نفس الرصيد مرتين). لو الأدمن رفض الطلب، يرجع الرصيد.

### 7. خصم الـ Discount Code على منتجات محددة (Part C1)

لو `applies_to = specific_products`، الخصم يُحسب على إجمالي المنتجات المنطبقة فقط (مش كل الكارت). **هذا القرار يحتاج تأكيد من صاحب المشروع** — موضّح في تقرير Part C1.

### 8. Constants في settings.py

```python
# Marketer System Constants
MARKETER_MONTHLY_TARGET_ORDERS = 10      # عدد الأوردرات المطلوب للترقية
MARKETER_MIN_TEAM_MEMBERS = 10           # الحد الأدنى للمسوقين عند الترقية
MARKETER_CYCLE_DAYS = 30                 # مدة الدورة الشهرية بالأيام
```

### 9. Convention التسمية

- **Backend**: snake_case للـ models والـ fields، PascalCase للـ classes
- **Frontend**: PascalCase للـ components، camelCase للـ functions
- **APIs**: `/api/marketers/...` للمسوق، `/api/dashboard/marketers/...` للأدمن
- **Files**: نفس pattern الموجود: `apps/[domain]/models.py`, `views.py`, `serializers.py`, `urls.py`, `signals.py`, `admin.py`

---

## سجل التقدم

*(فاضي — هيتزود بعد كل Part)*

---

## ملاحظات مفتوحة تحتاج تأكيد صاحب المشروع

1. **خصم على منتجات محددة** (Part C1): الخصم على الجزء المنطبق فقط من الكارت، وليس الإجمالي الكلي؟
2. **Celery vs Cron**: هل سيُفعَّل Celery فعلياً على السيرفر أم نكتفي بـ cron job للـ management command؟