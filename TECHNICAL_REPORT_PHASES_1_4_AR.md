# التقرير التقني التفصيلي — مشروع SHARK (المراحل 1 → 4)

> الهدف: توثيق كل ما تم بناؤه في الموقع (Frontend + Backend + Data + Infra) بشكل يمكن تسليمه مباشرة لفريق/شات المرحلة الخامسة.

---

## 1) نظرة عامة سريعة على النظام

المشروع عبارة عن منصة E‑Commerce كاملة (API + واجهة مستخدم) مبنية على:

- **Backend:** Django + Django REST Framework + JWT.
- **Frontend:** React (Vite) + React Query + Zustand + i18n + Framer Motion.
- **Database:** PostgreSQL.
- **Infra محلي:** Docker Compose (frontend/backend/db/redis).

المعمارية الحالية هي **Monorepo** فيه مجلدين رئيسيين:
- `backend/` لخدمات الـ API والمنطق التجاري.
- `frontend/` لتطبيق العميل ولوحة التحكم.

---

## 2) البنية التقنية (Infrastructure & Runtime)

### 2.1 الخدمات في Docker Compose

النظام المحلي فيه 4 خدمات:

1. `db` (PostgreSQL 15) لحفظ البيانات الأساسية.
2. `redis` مضاف وجاهز للتوسعة (Caching / Celery broker).
3. `backend` (Django) ويعمل على `:8080` خارجيًا.
4. `frontend` (Vite dev server) ويعمل على `:5199` خارجيًا.

### 2.2 إعدادات مهمة

- Backend يعتمد على متغيرات بيئة (`python-decouple`) لقراءة DB / Secret / Hosts.
- `REST_FRAMEWORK` مُعد افتراضيًا على JWT authentication + pagination + filtering/search/ordering.
- CORS مسموح حاليًا لبيئة التطوير المحلية.
- Redis وCelery موجودين في الإعدادات لكن لا توجد Tasks فعلية منفذة حتى الآن.

### 2.3 Frontend networking

- Vite Proxy يمرر `/api` إلى `http://backend:8000` داخل شبكة Docker.
- Axios instance موحد يضيف JWT access token تلقائيًا ويعمل refresh تلقائي عند 401.

---

## 3) الموديل الدوميني (Domain Model)

## 3.1 Users

### الجداول:
- `User` (Custom AbstractUser):
  - Login بالـ email (مش username).
  - `role`: `admin | staff | customer`.
  - حقول إضافية: `phone`, `address`, `created_at`.
- `CustomerProfile`:
  - OneToOne مع `User`.
  - `date_of_birth`, `profile_picture`, `notes`.

### سلوك تلقائي:
- Signal ينشئ `CustomerProfile` تلقائيًا عند إنشاء customer جديد.

## 3.2 Catalog (Products)

### الجداول:
- `Category`:
  - يدعم parent/subcategories (تصنيف هرمي).
  - slug auto-generation.
- `Product`:
  - مرتبط بـ Category.
  - `base_price`, `is_active`, `is_featured`.
  - خصائص مشتقة: `main_image`, `in_stock`.
- `ProductVariant`:
  - لكل منتج variants متعددة (SKU unique).
  - `price_override` اختياري فوق base_price.
- `Stock`:
  - OneToOne مع variant.
  - `quantity`, `low_stock_threshold`.
- `ProductImage`:
  - يدعم أكثر من صورة مع `is_main` و`order`.
  - عند ضبط صورة كـ main يتم إلغاء main من باقي الصور تلقائيًا.

## 3.3 Cart

### الجداول:
- `Cart`:
  - إما مرتبطة بـ user (OneToOne) أو guest session_key.
  - بها CheckConstraint يمنع وجود cart بدون user ولا session.
  - خصائص مشتقة: `total_items`, `total_price`, `is_empty`.
- `CartItem`:
  - `unique_together(cart, variant)` لمنع تكرار نفس الـ variant.
  - `subtotal` و`is_available` محسوبين.

### سلوك تلقائي:
- Signal ينشئ Cart تلقائيًا لكل customer جديد.

## 3.4 Orders

### الجداول:
- `Order`:
  - customer (nullable للحالات الخاصة مستقبلًا).
  - snapshot بيانات شحن (`shipping_name`, `shipping_phone`, `shipping_address`).
  - status lifecycle: `pending → confirmed → shipped → delivered` (+ `cancelled`).
  - `total` محسوب من items.
- `OrderItem`:
  - Snapshot ثابت للمنتج وقت الطلب (`product_name`, `variant_name`, `price_at_order`).
- `OrderStatusHistory`:
  - تاريخ كل تغيير حالة + من قام به + note.

### سلوك تلقائي:
- Signal `pre_save` يسجل أي تغيير status في history تلقائيًا.

## 3.5 Invoices

### الجداول:
- `Invoice`:
  - OneToOne مع Order.
  - `invoice_number` auto-generated بصيغة سنوية (`INV-YYYY-xxxxx`).
  - Snapshot بيانات العميل ومجاميع subtotal/discount/tax/total.
  - status: `draft | issued | paid | void`.
- `InvoiceItem`:
  - نسخة قانونية ثابتة لعناصر الطلب.

### سلوك تلقائي:
- عند إنشاء Order، ينشأ Invoice Draft تلقائيًا + نسخ العناصر.
- عند إضافة OrderItem يتم تحديث إجماليات الفاتورة.

---

## 4) طبقات الـ Backend (APIs + Business Logic)

## 4.1 Auth & Users APIs (`/api/auth/`)

- `POST /register/`:
  - إنشاء customer جديد.
  - يرجع user + refresh/access مباشرة.
- `POST /login/`:
  - JWT pair عبر `TokenObtainPairView`.
- `POST /logout/`:
  - blacklisting للـ refresh token.
- `POST /token/refresh/`:
  - إصدار access token جديد.
- `GET/PUT /profile/`:
  - قراءة/تعديل بيانات المستخدم الحالي.
- `POST /change-password/`.
- Admin/Staff:
  - `GET /customers/` (مع search).
  - `GET /customers/{id}/` ملخص عميل + أوامره + إجمالي الإنفاق.

## 4.2 Products APIs (`/api/products/`)

### Public
- `GET /`            → Categories root.
- `GET /items/`      → Product listing (filter/search/order/pagination).
- `GET /items/{slug}` → Product detail.
- `GET /featured/`   → منتجات مميزة.

### Admin/Staff
- `ModelViewSet /admin/products/`:
  - CRUD كامل للمنتجات.
  - Action إضافي `upload_image`.
  - Action إضافي `add_variant`.

## 4.3 Cart APIs (`/api/cart/`)

- `GET /`          → cart current.
- `POST /add/`     → add item (أو زيادة quantity).
- `PATCH /item/{id}/` → update quantity.
- `DELETE /item/{id}/` → remove item.
- `DELETE /clear/` → clear كامل.
- `GET /summary/`  → checkout readiness + unavailable items.

### منطق cart مهم:
- يعمل للمستخدم المسجل وللـ guest عبر session key.
- يتحقق من stock عند add/update.
- يعيد cart serializer كاملة في معظم العمليات لتسهيل تحديث الواجهة.

## 4.4 Orders APIs (`/api/orders/`)

### Customer
- `POST /`                → إنشاء order من cart.
- `GET /my/`              → أوامر المستخدم الحالي.
- `GET /my/{id}/`         → تفاصيل order تخص المستخدم فقط.
- `POST /my/{id}/cancel/` → إلغاء pending فقط + إرجاع الكمية للمخزون.
- `GET /track/{order_id}/` → تتبع order بدون login.

### Admin/Staff
- `GET /admin/`             → كل الطلبات + filter status.
- `GET /admin/{id}/`        → تفاصيل كاملة.
- `PATCH /admin/{id}/status/` → تحديث الحالة مع منع rollback.

### منطق إنشاء الطلب (CreateOrderSerializer)
1. يتأكد من وجود cart للمستخدم.
2. يتأكد cart ليست فارغة.
3. يتأكد كل العناصر متاحة في stock.
4. ينشئ order + ينقل snapshot items.
5. يخصم الكميات من stock.
6. يحسب total.
7. يفرغ cart.

## 4.5 Dashboard APIs (`/api/dashboard/`)

- `GET /stats/`:
  - إحصائيات orders/revenue/customers/products.
  - status breakdown.
  - recent orders.
- `GET /sales-chart/?days=30`:
  - revenue + orders per day.
- `GET /top-products/?limit=10`:
  - الأكثر مبيعًا.

> كل endpoints الخاصة بالـ dashboard محمية بصلاحية admin/staff.

## 4.6 Invoices APIs (`/api/invoices/`)

- حاليًا `urls.py` فارغة (لا يوجد endpoints مُفعلة).
- لكن الـ models + signals جاهزين فعليًا، يعني جزء كبير من logic الخلفي متبني بالفعل.

---

## 5) Frontend Architecture

## 5.1 الهيكل العام

- `App.jsx` يضبط routing الأساسي + layout (Navbar/Footer).
- `main.jsx` يلف التطبيق بـ `QueryClientProvider`.
- `PrivateRoute` يحمي المسارات حسب تسجيل الدخول والأدوار.

### المسارات الأساسية المتاحة
- `/` Home
- `/products` listing
- `/products/:slug` detail
- `/cart`
- `/checkout` (محمي login)
- `/login`, `/register`
- `/track/:id`
- `/dashboard/*` (محمي admin/staff)

## 5.2 State Management

### Zustand
- `authStore`:
  - `user`, `isAuthenticated`, `setUser`, `logout`.
- `themeStore` (persist):
  - `theme` + `toggleTheme` مع حفظ في localStorage.

### React Query
- إدارة fetching/caching للبيانات الديناميكية (cart/products/etc).
- Mutations مستخدمة للأوامر والعمليات التفاعلية.

## 5.3 i18n + RTL

- `i18next` مهيأ للغتين `ar` و`en`.
- default language من `localStorage` أو العربية.
- Navbar يضبط `document.dir` و`document.lang` ديناميكيًا.
- ملفات ترجمة منفصلة `ar.json`, `en.json`.

## 5.4 تجربة واجهة المستخدم

- الواجهة تعتمد تصميم حديث مع Motion Animations في:
  - Navbar transitions.
  - Product cards.
  - Cart interactions.
  - Auth forms.
  - Checkout states.
- يوجد دعم Theme toggle (Dark/Light).
- يوجد responsive behavior خاصة في Navbar وProducts/Cart.

---

## 6) ربط المراحل 1→4 (توصيف عملي للتسليم)

> التقسيم التالي عملي/تشغيلي مبني على الموجود في الكود الحالي، لتسهيل تسليم المرحلة الخامسة.

### المرحلة 1 — الأساس والهوية
- إنشاء بنية المشروع (Django + React + Docker).
- Custom User + JWT + Register/Login/Profile.
- إعداد role-based model (admin/staff/customer).

### المرحلة 2 — الكتالوج والسلة
- Catalog كامل (Category/Product/Variant/Stock/Images).
- APIs عامة للمنتجات + Filtering/Search/Ordering.
- Cart logic للمستخدم والضيف + stock validation.

### المرحلة 3 — دورة الطلب والتشغيل الداخلي
- إنشاء Order من cart مع snapshots.
- إدارة status + history + الإلغاء واسترجاع المخزون.
- Dashboard APIs (stats/charts/top products).

### المرحلة 4 — تجربة إتمام الشراء + المحاسبة الأولية
- واجهة Checkout متكاملة (بيانات الشحن + confirmation state).
- Track order flow.
- توليد Invoice تلقائيًا backend-side عند إنشاء order.

---

## 7) الأمان والصلاحيات

- Authentication: JWT access/refresh.
- Logout يعمل blacklist للـ refresh token.
- معظم API افتراضيًا `IsAuthenticated` من إعدادات DRF.
- Endpoints العامة Explicit `AllowAny` عند الحاجة (catalog/cart/track).
- Endpoints الإدارية محمية بـ custom permission (`role in ['admin','staff']`).

---

## 8) القيود/الملاحظات الحالية (مهمة قبل المرحلة 5)

1. **Invoices API غير مكشوفة** رغم أن الموديلات والـ signals جاهزة.
2. **بعض مفاتيح localStorage غير موحدة في الواجهة**:
   - Axios يقرأ `access_token`/`refresh_token`.
   - جزء من register يحفظ `access`/`refresh`.
   - يلزم توحيد لتجنب مشاكل session بعد التسجيل.
3. **صفحات مثل Profile/Orders مرتبطة في الـ Navbar** لكنها ليست ضمن routes الظاهرة في `App.jsx` حاليًا.
4. **لا توجد اختبارات فعلية مُفعّلة** (ملفات tests موجودة لكن شبه فارغة).
5. **Celery/Redis مضافة لكن غير مستخدمة بمهام production logic حتى الآن**.

---

## 9) خطة تقنية مقترحة للمرحلة الخامسة

## 9.1 أولويات عاجلة (Sprint 1)
- توحيد مفاتيح الـ token في frontend بالكامل.
- إضافة routes/صفحات Profile + My Orders أو إزالة الروابط غير المفعلة.
- تفعيل Invoices APIs (list/detail/issue/mark-paid/pdf لاحقًا).

## 9.2 أولويات جودة واستقرار (Sprint 2)
- كتابة Test suite أساسية:
  - auth flows
  - cart stock constraints
  - order creation/cancel/status transitions
  - dashboard aggregates sanity
- إضافة Validation أقوى للتدفق المالي (Decimal handling + rounding policy).
- تحسين error contracts بين backend/frontend.

## 9.3 أولويات تشغيلية (Sprint 3)
- logging + monitoring + health endpoints.
- تجهيز CI (lint + tests + build).
- تحضير بيئة staging حقيقية (nginx + gunicorn + static/media strategy).

---

## 10) Hand-off مختصر جاهز للإرسال للشات القادم

**الوضع الحالي:**
- المنصة جاهزة end-to-end حتى تأكيد الطلب وتتبعه.
- Core commerce logic موجود (catalog/cart/orders/dashboard).
- invoices logic الخلفي موجود لكن API layer ناقصة.
