/**
 * MarketerDashboardPage.jsx
 * داشبورد المسوق الشخصي — UI محسّن ليتناسب مع ستايل الموقع
 *
 * ⚠️ تحديث (توحيد التصميم): الصفحة بقت تستخدم نفس الكلاسات المشتركة
 * المستخدمة في باقي الموقع (orders.css / index.css / admin dashboard.css):
 * orders-btn / orders-input / orders-select / orders-field / orders-table /
 * orders-surface / stats-grid / stats-card / badge-* / orders-feedback /
 * dashboard-error / orders-empty / orders-skeleton. مفيش ألوان inline
 * عشوائية تانية — كل لون بيرجع لنفس الـ CSS variables المعرّفة في
 * :root (index.css) عشان الشكل يبقى متطابق مع باقي لوحات التحكم
 * (بالظبط زي TeamLeaderDashboardPage.jsx اللي اتعدّلت قبل كده).
 *
 * ⚠️ تحديث (دعم أسطر متعددة في الأوردر): NewOrderForm بقت تجربة شبيهة
 * بالكارت — المسوق بيضيف صنف (منتج + variant + كمية + سعر بيع) للسلة،
 * يقدر يضيف أكتر من صنف، يحذف أي صنف قبل التأكيد، وبعدين يدخل بيانات
 * العميل والشحن مرة واحدة لكل الأوردر، ويأكد. الطلب بيتبعت كـ
 * `items: [...]` للـ API (راجع MarketerOrderCreateSerializer في
 * backend). OrdersTab بقت تعرض كل أصناف الأوردر (مش صنف واحد بس)، مع
 * fallback كامل للأوردرات القديمة (سطر واحد، مفيش items) عن طريق
 * OrderLinesCell.
 *
 * ⚠️ تحديث (دعوات الانضمام للفريق): endpoint /submit-team/ القديم اتلغى
 * نهائيًا من الباك إند وبقى بيرجع 404. النظام دلوقتي دورة دعوة/رد:
 *   - TeamLeaderBanner (حالة accepted_pending_requirement): بدل ما
 *     يضم المرشَّحين مباشرة، بقى يرشّحهم (nominateTeamMembers) —
 *     بيبعتلهم دعوة pending، ومفيش حد أدنى 10 لإرسال الترشيح نفسه
 *     (القائد يقدر يرشّح أي عدد، ويرشّح دفعات تانية لاحقًا). الترقية
 *     الفعلية بتتم في الباك إند تلقائيًا لما عدد الموافقين يوصل
 *     MARKETER_MIN_TEAM_MEMBERS.
 *   - TeamInvitationsBanner (جديد): يظهر لأي مسوق (مش بس اللي بيحاول
 *     يترقى) لو عنده دعوات انضمام معلّقة وصلته من قائد فريق، ويقدر
 *     يقبل أو يرفض من هنا مباشرة.
 */
import { useState, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyMarketerProfile,
  getMyMarketerOrders,
  getMyProductPrices,
  createMarketerOrder,
  getMyTeamLeaderRequest,
  respondToTeamLeaderRequest,
  getAvailableForTeam,
  nominateTeamMembers,
  getMyTeamInvitations,
  respondToTeamInvitation,
  getMyWithdrawals,
  createWithdrawal,
} from '../../services/marketerService';
import api from '../../services/api';

/* ─────────────────────────────────────────────────────────────── */
/*  Shared atoms — تستخدم نفس الكلاسات المشتركة في كل الموقع       */
/* ─────────────────────────────────────────────────────────────── */

function Eyebrow({ children }) {
  return (
    <div
      style={{
        fontSize: '10px',
        color: 'var(--accent)',
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        fontWeight: 800,
        marginBottom: '6px',
      }}
    >
      ✦ {children}
    </div>
  );
}

function SectionCard({ children, style }) {
  return (
    <div className="orders-surface" style={{ marginBottom: '24px', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

/* Status pill — كلاس .badge الموحّد (index.css) عشان كل الحالات في
   الموقع تطلع بنفس الألوان بالظبط (أوردرات، سحوبات، حالة الحساب...). */
function StatusBadge({ status }) {
  const variant = {
    pending: 'badge-warning',
    confirmed: 'badge-success',
    rejected: 'badge-danger',
    approved: 'badge-info',
    paid: 'badge-success',
    active: 'badge-success',
    suspended: 'badge-danger',
  }[status] || 'badge-neutral';

  return <span className={`badge ${variant}`}>{status}</span>;
}

function SkeletonRows({ count = 3, height = 56 }) {
  return (
    <div className="orders-skeleton" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="orders-skeleton-row" style={{ height }} />
      ))}
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div className="dashboard-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="orders-btn orders-btn--secondary orders-btn--table">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return (
    <Motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="orders-feedback orders-feedback--error"
      style={{ marginBottom: '14px' }}
    >
      {message}
    </Motion.div>
  );
}

function FormSuccess({ message }) {
  if (!message) return null;
  return (
    <Motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className="orders-feedback orders-feedback--success"
      style={{ marginBottom: '14px' }}
    >
      {message}
    </Motion.div>
  );
}

/* حقل فورم موحّد — بيستخدم .orders-field (orders.css) عشان كل
   اللابلز في الموقع تبقى بنفس الشكل والمسافات بالظبط. */
function Field({ label, required, full, children }) {
  return (
    <div className={`orders-field${full ? ' orders-field--full' : ''}`}>
      <span>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginInlineStart: '3px' }}>*</span>}
      </span>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Stats Row                                                       */
/* ─────────────────────────────────────────────────────────────── */

/* Icons رندرت زي بالظبط STAT ICONS بتاعة StatsCard في داشبورد الأدمن */
const STAT_ICONS = {
  orders_month: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  orders_total: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  balance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  profit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
};

function StatsRow({ profile }) {
  const cards = [
    {
      key: 'orders_month',
      label: 'أوردرات هذا الشهر',
      value: profile.monthly_completed_orders_count ?? 0,
      sub: 'الدورة الشهرية الحالية',
      accent: false,
    },
    {
      key: 'orders_total',
      label: 'إجمالي الأوردرات',
      value: profile.lifetime_total_orders ?? 0,
      sub: 'منذ الانضمام — للمعلومة فقط',
      accent: false,
    },
    {
      key: 'balance',
      label: 'الرصيد القابل للسحب الآن',
      value: `${Number(profile.monthly_profit_balance ?? 0).toFixed(2)} ج.م`,
      sub: 'رصيد الدورة الحالية — للمعلومة فقط',
      accent: true,
    },
    {
      key: 'profit',
      label: 'إجمالي الأرباح منذ الانضمام',
      value: `${Number(profile.lifetime_total_profit ?? 0).toFixed(2)} ج.م`,
      sub: 'تراكمي — للمعلومة فقط',
      accent: false,
    },
  ];

  return (
    <div className="stats-grid" style={{ marginBottom: '28px' }}>
      {cards.map((c, i) => (
        <Motion.article
          key={c.key}
          className="stats-card"
          aria-label={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.07 }}
          style={
            c.accent
              ? { border: '1.5px solid var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }
              : {}
          }
        >
          <div className="stats-card__header">
            <span className="stats-card__icon">{STAT_ICONS[c.key]}</span>
            <p className="stats-card__title">{c.label}</p>
          </div>
          <h3 className="stats-card__value" style={c.accent ? { color: 'var(--accent)' } : {}}>
            {c.value}
          </h3>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{c.sub}</p>
        </Motion.article>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Overview Tab                                                   */
/* ─────────────────────────────────────────────────────────────── */

function OverviewTab({ profile, onGoTo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Cycle info card */}
      <div className="orders-surface" style={{ padding: '24px 28px' }}>
        <Eyebrow>الدورة الشهرية</Eyebrow>
        <h2 className="orders-section-title" style={{ margin: '4px 0 20px', fontSize: '1.4rem' }}>
          معلومات الدورة الحالية
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '24px',
          }}
        >
          {[
            { label: 'رقم الدورة', value: `#${(profile.current_cycle_number ?? 0) + 1}` },
            {
              label: 'تاريخ الانضمام',
              value: profile.cycle_anchor_date
                ? new Date(profile.cycle_anchor_date).toLocaleDateString('ar-EG')
                : '—',
            },
            {
              label: 'حالة الحساب',
              value: (
                <span className={`badge ${profile.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                  {profile.status === 'active' ? 'نشط' : 'موقوف'}
                </span>
              ),
            },
          ].map((item) => (
            <div key={item.label}>
              <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {item.label}
              </p>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions card */}
      <div className="orders-surface" style={{ padding: '24px 28px' }}>
        <Eyebrow>إجراءات سريعة</Eyebrow>
        <h2 className="orders-section-title" style={{ margin: '4px 0 20px', fontSize: '1.4rem' }}>
          ماذا تريد أن تفعل؟
        </h2>
        <div className="orders-actions">
          <button type="button" onClick={() => onGoTo('new-order')} className="orders-btn orders-btn--primary">
            + تسجيل أوردر جديد
          </button>
          <button type="button" onClick={() => onGoTo('orders')} className="orders-btn orders-btn--secondary">
            عرض أوردراتي
          </button>
          <button
            type="button"
            onClick={() => onGoTo('withdraw')}
            className="orders-btn orders-btn--secondary"
            disabled={Number(profile?.monthly_profit_balance ?? 0) <= 0}
          >
            طلب سحب أرباح
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  New Order Form — تجربة شبيهة بالكارت (أسطر متعددة)             */
/* ─────────────────────────────────────────────────────────────── */

const EMPTY_LINE_DRAFT = {
  product_id: '',
  variant_id: '',
  quantity: 1,
  sale_price_per_unit: '',
};

const EMPTY_CUSTOMER = {
  customer_name: '',
  customer_phone: '',
  shipping_address: '',
  shipping_region_id: '',
};

function NewOrderForm({ onSuccess }) {
  const qc = useQueryClient();

  /* ── Product prices assigned to this marketer ── */
  const { data: pricesData, isLoading: pricesLoading } = useQuery({
    queryKey: ['my-product-prices'],
    queryFn: getMyProductPrices,
  });
  const prices = Array.isArray(pricesData) ? pricesData : (pricesData?.results ?? []);

  /* ── Shared customer/shipping fields (مرة واحدة لكل الأوردر) ── */
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);

  /* ── الأصناف المضافة للسلة (cart-like) ── */
  const [lines, setLines] = useState([]);

  /* ── مسودة الصنف الحالي اللي بيتجهز قبل الإضافة للسلة ── */
  const [draft, setDraft] = useState(EMPTY_LINE_DRAFT);
  const [formError, setFormError] = useState(null);

  /* ── Fetch variants when draft product changes ── */
  const { data: variantsData, isLoading: variantsLoading } = useQuery({
    queryKey: ['product-variants', draft.product_id],
    queryFn: () =>
      api.get(`/products/${draft.product_id}/variants/`).then((r) => r.data),
    enabled: !!draft.product_id,
  });
  const variants = Array.isArray(variantsData)
    ? variantsData
    : (variantsData?.results ?? []);

  /* ── Fetch shipping regions (محافظات الشحن) ── */
  const { data: shippingRegionsData, isLoading: shippingRegionsLoading } = useQuery({
    queryKey: ['shipping-regions'],
    queryFn: () => api.get('/orders/shipping-regions/').then((r) => r.data),
  });
  const shippingRegions = Array.isArray(shippingRegionsData)
    ? shippingRegionsData
    : (shippingRegionsData?.results ?? []);
  const selectedShippingRegion = shippingRegions.find(
    (r) => String(r.id) === String(customer.shipping_region_id)
  );

  /* available = variants that have stock > 0 */
  const availableVariants = variants.filter(
    (v) => v.is_active && (v.stock?.quantity ?? 0) > 0
  );

  /* ── Reset variant when draft product changes ── */
  const handleProductChange = (e) => {
    setDraft((p) => ({ ...p, product_id: e.target.value, variant_id: '' }));
  };

  const setDraftField = (field) => (e) =>
    setDraft((p) => ({ ...p, [field]: e.target.value }));

  const setCustomerField = (field) => (e) =>
    setCustomer((p) => ({ ...p, [field]: e.target.value }));

  /* ── Derived (draft) ── */
  const selectedPrice = prices.find(
    (p) => String(p.product) === String(draft.product_id)
  );
  const selectedVariant = availableVariants.find(
    (v) => String(v.id) === String(draft.variant_id)
  );
  const draftProfit =
    selectedPrice && draft.sale_price_per_unit && draft.quantity
      ? (
          (Number(draft.sale_price_per_unit) -
            Number(selectedPrice.assigned_price)) *
          Number(draft.quantity)
        ).toFixed(2)
      : null;

  /* ── إضافة المسودة الحالية كصنف في السلة ── */
  const handleAddLine = () => {
    setFormError(null);
    if (!draft.product_id) return setFormError('اختر منتجًا أولاً.');
    if (availableVariants.length > 0 && !draft.variant_id)
      return setFormError('اختر اللون والمقاس المطلوب.');
    if (!draft.sale_price_per_unit || Number(draft.sale_price_per_unit) <= 0)
      return setFormError('سعر البيع لازم يكون أكبر من صفر.');
    if (!draft.quantity || Number(draft.quantity) < 1)
      return setFormError('الكمية لازم تكون 1 على الأقل.');
    if (selectedVariant && Number(draft.quantity) > (selectedVariant.stock?.quantity ?? 0))
      return setFormError(
        `الكمية المطلوبة أكبر من المخزون المتاح (${selectedVariant.stock?.quantity ?? 0} قطعة).`
      );

    const productName = selectedPrice?.product_name || `منتج #${draft.product_id}`;
    const variantLabel = selectedVariant
      ? [selectedVariant.color?.name, selectedVariant.size?.name].filter(Boolean).join(' / ') || selectedVariant.name
      : null;

    setLines((prev) => [
      ...prev,
      {
        key: `${draft.product_id}-${draft.variant_id || 'novariant'}-${Date.now()}`,
        product_id: Number(draft.product_id),
        product_name: productName,
        variant_id: draft.variant_id ? Number(draft.variant_id) : null,
        variant_label: variantLabel,
        quantity: Number(draft.quantity),
        sale_price_per_unit: Number(draft.sale_price_per_unit),
        assigned_price: selectedPrice ? Number(selectedPrice.assigned_price) : null,
        max_stock: selectedVariant?.stock?.quantity ?? null,
      },
    ]);

    /* تصفير المسودة بعد الإضافة عشان يضيف صنف جديد */
    setDraft(EMPTY_LINE_DRAFT);
  };

  /* ── حذف صنف من السلة ── */
  const handleRemoveLine = (key) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  /* ── إجماليات السلة ── */
  const linesTotal = lines.reduce(
    (sum, l) => sum + l.sale_price_per_unit * l.quantity,
    0
  );
  const linesProfit = lines.reduce(
    (sum, l) =>
      sum + (l.assigned_price != null ? (l.sale_price_per_unit - l.assigned_price) * l.quantity : 0),
    0
  );

  /* ── Submit الأوردر كامل (كل الأصناف + بيانات العميل) ── */
  const mutation = useMutation({
    mutationFn: createMarketerOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-marketer-orders'] });
      qc.invalidateQueries({ queryKey: ['my-marketer-profile'] });
      setLines([]);
      setDraft(EMPTY_LINE_DRAFT);
      setCustomer(EMPTY_CUSTOMER);
      setFormError(null);
      onSuccess?.();
    },
    onError: (err) => {
      const data = err?.response?.data;
      setFormError(
        typeof data === 'object' && data !== null
          ? Object.values(data).flat().join(' | ')
          : err?.message || 'حدث خطأ غير متوقع.'
      );
    },
  });

  const handleSubmitOrder = () => {
    setFormError(null);
    if (lines.length === 0) return setFormError('أضف صنفًا واحدًا على الأقل قبل تأكيد الأوردر.');
    if (!customer.customer_name.trim()) return setFormError('اسم العميل مطلوب.');
    if (!customer.shipping_region_id) return setFormError('اختر محافظة الشحن.');
    if (!customer.shipping_address.trim()) return setFormError('عنوان الشحن بالتفصيل مطلوب.');

    mutation.mutate({
      items: lines.map((l) => ({
        product_id: l.product_id,
        ...(l.variant_id ? { variant_id: l.variant_id } : {}),
        quantity: l.quantity,
        sale_price_per_unit: l.sale_price_per_unit,
      })),
      customer_name: customer.customer_name.trim(),
      customer_phone: customer.customer_phone.trim(),
      shipping_region_id: Number(customer.shipping_region_id),
      shipping_address: customer.shipping_address.trim(),
    });
  };

  return (
    <div>
      <Eyebrow>تسجيل أوردر</Eyebrow>
      <h2 className="orders-section-title" style={{ margin: '4px 0 4px', fontSize: '1.4rem' }}>
        أوردر جديد
      </h2>
      <p className="orders-muted" style={{ margin: '0 0 24px', fontSize: '0.84rem' }}>
        ضيف منتج أو أكتر للسلة (نفس المنتج بألوان/مقاسات مختلفة أو منتجات مختلفة)، وبعدين أدخل بيانات العميل وأكّد الأوردر. سيظهر بحالة "قيد المراجعة" حتى يؤكده الأدمن.
      </p>

      <FormError message={formError} />

      {/* ── سلة الأصناف المضافة ── */}
      {lines.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: '10px',
            }}
          >
            أصناف الأوردر ({lines.length})
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <AnimatePresence initial={false}>
              {lines.map((l, i) => (
                <Motion.div
                  key={l.key}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: i < lines.length - 1 ? '1px solid var(--border)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-primary)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {l.product_name}
                      {l.variant_label && (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}> — {l.variant_label}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      الكمية: {l.quantity} × {l.sale_price_per_unit.toFixed(2)} ج.م = {(l.quantity * l.sale_price_per_unit).toFixed(2)} ج.م
                      {l.assigned_price != null && (
                        <span style={{ color: 'var(--success)', marginInlineStart: '8px' }}>
                          ربح: {((l.sale_price_per_unit - l.assigned_price) * l.quantity).toFixed(2)} ج.م
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(l.key)}
                    className="orders-btn orders-btn--danger orders-btn--table"
                  >
                    حذف
                  </button>
                </Motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', marginTop: '10px', fontSize: '0.85rem' }}>
            <span className="orders-muted">
              الإجمالي: <strong style={{ color: 'var(--text-primary)' }}>{linesTotal.toFixed(2)} ج.م</strong>
            </span>
            <span className="orders-muted">
              الربح المتوقع: <strong style={{ color: 'var(--success)' }}>{linesProfit.toFixed(2)} ج.م</strong>
            </span>
          </div>
        </div>
      )}

      {/* ── فورم إضافة صنف جديد ── */}
      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '18px',
        }}
      >
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '14px',
          }}
        >
          إضافة صنف
        </div>

        <div className="orders-form-grid">

          {/* Product select */}
          <Field label="المنتج" required full>
            {pricesLoading ? (
              <div className="orders-input" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                جارٍ تحميل المنتجات…
              </div>
            ) : prices.length === 0 ? (
              <div className="orders-feedback orders-feedback--error" style={{ margin: 0 }}>
                لا يوجد منتجات معيّن لك سعر عليها بعد — تواصل مع الإدارة.
              </div>
            ) : (
              <select className="orders-select" value={draft.product_id} onChange={handleProductChange}>
                <option value="">— اختر منتج —</option>
                {prices.map((p) => (
                  <option key={p.id} value={p.product}>
                    {p.product_name} — سعر تكلفتك: {Number(p.assigned_price).toFixed(2)} ج.م
                  </option>
                ))}
              </select>
            )}
          </Field>

          {/* Cost info banner */}
          {selectedPrice && (
            <div
              className="orders-field--full"
              style={{
                padding: '11px 14px',
                background: 'color-mix(in srgb, var(--info) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--info) 25%, var(--border))',
                borderRadius: '2px',
                fontSize: '0.83rem',
                color: 'var(--text-secondary)',
              }}
            >
              سعر التكلفة المحدد لك:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {Number(selectedPrice.assigned_price).toFixed(2)} ج.م
              </strong>
              {' '}— ربحك = (سعر بيعك − سعر التكلفة) × الكمية
            </div>
          )}

          {/* Variant select — اللون والمقاس (يظهر فقط لو المنتج فيه variants فعلاً) */}
          {draft.product_id && (variantsLoading || variants.length > 0) && (
            <Field label="اللون والمقاس" required full>
              {variantsLoading ? (
                <div className="orders-input" style={{ color: 'var(--text-secondary)' }}>جارٍ تحميل المتغيرات…</div>
              ) : availableVariants.length === 0 ? (
                <div className="orders-feedback orders-feedback--error" style={{ margin: 0 }}>
                  المنتج ده مفيش منه مخزون متاح حالياً.
                </div>
              ) : (
                <>
                  <select className="orders-select" value={draft.variant_id} onChange={setDraftField('variant_id')}>
                    <option value="">— اختر اللون والمقاس —</option>
                    {availableVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {[v.color?.name, v.size?.name].filter(Boolean).join(' / ') || v.name}
                        {' '}— متاح: {v.stock?.quantity ?? 0} قطعة
                      </option>
                    ))}
                  </select>

                  {/* Color swatches preview */}
                  {draft.variant_id && selectedVariant?.color?.hex_code && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: selectedVariant.color.hex_code,
                          border: '2px solid var(--border-strong)',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {selectedVariant.color.name}
                        {selectedVariant.size ? ` — ${selectedVariant.size.name}` : ''}
                        {' '}&bull;{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {selectedVariant.stock?.quantity ?? 0} قطعة متاحة
                        </strong>
                      </span>
                    </div>
                  )}
                </>
              )}
            </Field>
          )}

          {/* Quantity */}
          <Field label="الكمية" required>
            <input
              type="number"
              min="1"
              max={selectedVariant?.stock?.quantity ?? undefined}
              className="orders-input"
              value={draft.quantity}
              onChange={setDraftField('quantity')}
            />
            {selectedVariant && (
              <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                الحد الأقصى: {selectedVariant.stock?.quantity ?? '—'} قطعة
              </p>
            )}
          </Field>

          {/* Sale price */}
          <Field label="سعر البيع للعميل (ج.م)" required>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="orders-input"
              value={draft.sale_price_per_unit}
              onChange={setDraftField('sale_price_per_unit')}
              placeholder="0.00"
            />
          </Field>

          {/* Profit preview (للصنف الحالي قبل الإضافة) */}
          {draftProfit !== null && (
            <div
              className={`orders-feedback orders-field--full ${Number(draftProfit) >= 0 ? 'orders-feedback--success' : 'orders-feedback--error'}`}
              style={{ margin: 0 }}
            >
              ربح هذا الصنف:{' '}
              <strong style={{ fontSize: '1rem' }}>
                {draftProfit} ج.م
              </strong>
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={handleAddLine}
            disabled={prices.length === 0}
            className="orders-btn orders-btn--secondary orders-btn--table"
          >
            + إضافة الصنف للسلة
          </button>
        </div>
      </div>

      {/* ── قسم بيانات العميل والشحن (مرة واحدة لكل الأوردر) ── */}
      <div className="orders-form-grid" style={{ marginTop: '20px' }}>
        <div
          className="orders-field--full"
          style={{
            paddingTop: '8px',
            marginTop: '4px',
            borderTop: '1px solid var(--border)',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '4px',
          }}
        >
          بيانات العميل
        </div>

        {/* Customer name */}
        <Field label="اسم العميل" required>
          <input
            type="text"
            className="orders-input"
            value={customer.customer_name}
            onChange={setCustomerField('customer_name')}
            placeholder="الاسم الكامل"
          />
        </Field>

        {/* Customer phone */}
        <Field label="تليفون العميل">
          <input
            type="tel"
            className="orders-input"
            value={customer.customer_phone}
            onChange={setCustomerField('customer_phone')}
            placeholder="01XXXXXXXXX"
          />
        </Field>

        {/* Shipping region (محافظة الشحن) */}
        <Field label="محافظة الشحن" required>
          {shippingRegionsLoading ? (
            <div className="orders-input" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              جارٍ تحميل المحافظات…
            </div>
          ) : (
            <select className="orders-select" value={customer.shipping_region_id} onChange={setCustomerField('shipping_region_id')}>
              <option value="">— اختر المحافظة —</option>
              {shippingRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — رسوم الشحن: {Number(r.price).toFixed(2)} ج.م
                </option>
              ))}
            </select>
          )}
          {selectedShippingRegion && (
            <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              رسوم الشحن: {Number(selectedShippingRegion.price).toFixed(2)} ج.م
            </p>
          )}
        </Field>

        {/* Shipping address */}
        <Field label="عنوان الشحن بالتفصيل" required full>
          <input
            type="text"
            className="orders-input"
            value={customer.shipping_address}
            onChange={setCustomerField('shipping_address')}
            placeholder="رقم البيت، الشارع، الحي، المدينة"
          />
        </Field>

      </div>

      <div style={{ marginTop: '26px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          type="button"
          onClick={handleSubmitOrder}
          disabled={mutation.isPending || lines.length === 0}
          className="orders-btn orders-btn--primary"
          style={{ minWidth: '160px' }}
        >
          {mutation.isPending ? 'جارٍ الإرسال…' : `تأكيد الأوردر (${lines.length} صنف)`}
        </button>
        {mutation.isSuccess && (
          <Motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700 }}
          >
            ✓ تم التسجيل — في انتظار تأكيد الأدمن.
          </Motion.span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Orders Tab                                                     */
/* ─────────────────────────────────────────────────────────────── */

/**
 * ⚠️ تحديث (دعم أسطر متعددة): بتعرض كل أصناف الأوردر (order.items)
 * لو موجودة. لو الأوردر قديم (مفيش items — أوردرات ما قبل التحديث)،
 * بترجع تعرض الحقول القديمة المسطّحة (product_name/variant_*) — توافق
 * خلفي كامل، مفيش أوردر قديم هيفضل من غير عرض صحيح.
 */
function OrderLinesCell({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length === 0) {
    return (
      <div>
        <div>{order.product_name ?? `#${order.product}`}</div>
        {(order.variant_name || order.variant_color) && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {[order.variant_color, order.variant_size].filter(Boolean).join(' / ') || order.variant_name}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map((it) => (
        <div key={it.id} style={{ fontSize: '0.8rem' }}>
          <span style={{ fontWeight: 600 }}>{it.product_name ?? `#${it.product}`}</span>
          {(it.variant_name || it.variant_color) && (
            <span style={{ color: 'var(--text-secondary)' }}>
              {' '}— {[it.variant_color, it.variant_size].filter(Boolean).join(' / ') || it.variant_name}
            </span>
          )}
          <span style={{ color: 'var(--text-secondary)' }}> × {it.quantity}</span>
        </div>
      ))}
    </div>
  );
}

function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-marketer-orders', statusFilter],
    queryFn: () => getMyMarketerOrders(statusFilter ? { status: statusFilter } : {}),
  });

  const orders = Array.isArray(data) ? data : (data?.results ?? []);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '18px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <Eyebrow>السجل</Eyebrow>
          <h2 className="orders-section-title" style={{ fontSize: '1.05rem' }}>أوردراتي</h2>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="orders-select orders-select--table"
        >
          <option value="">كل الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="confirmed">مؤكَّد</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      {isLoading && <SkeletonRows count={4} height={52} />}
      {isError && <ErrorBox message="تعذّر تحميل الأوردرات." onRetry={refetch} />}

      {!isLoading && !isError && orders.length === 0 && (
        <div className="orders-empty">
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
          لا توجد أوردرات{statusFilter ? ` بحالة "${statusFilter}"` : ''} حتى الآن.
        </div>
      )}

      {!isLoading && !isError && orders.length > 0 && (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                {['الأصناف', 'الإجمالي', 'الربح', 'العميل', 'العنوان', 'الحالة', 'التاريخ'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => {
                const items = Array.isArray(o.items) ? o.items : [];
                const total = items.length > 0
                  ? items.reduce((s, it) => s + Number(it.subtotal ?? (it.sale_price_per_unit * it.quantity)), 0)
                  : Number(o.sale_price_per_unit ?? 0) * Number(o.quantity ?? 0);
                return (
                  <Motion.tr
                    key={o.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <td style={{ minWidth: '200px' }}>
                      <OrderLinesCell order={o} />
                    </td>
                    <td style={{ fontWeight: 600 }}>{total.toFixed(2)} ج.م</td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                      {Number(o.profit_amount).toFixed(2)} ج.م
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                      {o.customer_phone && (
                        <div className="orders-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                          {o.customer_phone}
                        </div>
                      )}
                    </td>
                    <td className="orders-muted" style={{ fontSize: '0.78rem', minWidth: '140px' }}>
                      {o.shipping_address || '—'}
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="orders-muted" style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {new Date(o.created_at).toLocaleDateString('ar-EG')}
                    </td>
                  </Motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Withdrawals Tab                                                */
/* ─────────────────────────────────────────────────────────────── */

function WithdrawTab({ availableBalance }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: getMyWithdrawals,
  });
  const withdrawals = Array.isArray(data) ? data : (data?.results ?? []);

  const mutation = useMutation({
    mutationFn: () => createWithdrawal(amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-withdrawals'] });
      qc.invalidateQueries({ queryKey: ['my-marketer-profile'] });
      setAmount('');
      setFormError(null);
    },
    onError: (err) => {
      const d = err?.response?.data;
      setFormError(
        typeof d === 'object' && d !== null
          ? Object.values(d).flat().join(' | ')
          : err?.message || 'حدث خطأ غير متوقع.'
      );
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!amount || Number(amount) <= 0) return setFormError('أدخل مبلغًا أكبر من صفر.');
    if (Number(amount) > Number(availableBalance))
      return setFormError(`الرصيد المتاح ${Number(availableBalance).toFixed(2)} ج.م فقط.`);
    mutation.mutate();
  };

  const balanceNum = Number(availableBalance);

  return (
    <div>
      <Eyebrow>الأرباح</Eyebrow>
      <h2 className="orders-section-title" style={{ fontSize: '1.05rem' }}>
        سحب الأرباح
      </h2>
      <p className="orders-muted" style={{ margin: '4px 0 20px', fontSize: '0.84rem' }}>
        يمكنك سحب من رصيد الدورة الحالية فقط.
      </p>

      {/* Balance display */}
      <div
        className="orders-card"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '22px',
          ...(balanceNum > 0
            ? { border: '1.5px solid color-mix(in srgb, var(--success) 35%, var(--border))', background: 'color-mix(in srgb, var(--success) 6%, var(--bg-card))' }
            : {}),
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
            الرصيد المتاح للسحب
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: balanceNum > 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
            {balanceNum.toFixed(2)} ج.م
          </div>
        </div>
      </div>

      <FormError message={formError} />

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '32px' }}>
        <div style={{ width: '200px' }}>
          <Field label="مبلغ السحب (ج.م)">
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="orders-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={mutation.isPending || balanceNum <= 0}
          className="orders-btn orders-btn--primary"
        >
          {mutation.isPending ? 'جارٍ الإرسال…' : 'طلب السحب'}
        </button>
        {mutation.isSuccess && (
          <Motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700 }}
          >
            ✓ تم إرسال طلب السحب.
          </Motion.span>
        )}
      </div>

      {/* History */}
      <h3 className="orders-section-title" style={{ fontSize: '0.95rem', marginBottom: '14px' }}>
        سجل طلبات السحب
      </h3>

      {isLoading && <SkeletonRows count={3} height={44} />}
      {isError && <ErrorBox message="تعذّر تحميل سجل الطلبات." onRetry={refetch} />}

      {!isLoading && !isError && withdrawals.length === 0 && (
        <div className="orders-empty">
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
          لا يوجد طلبات سحب سابقة.
        </div>
      )}

      {!isLoading && !isError && withdrawals.length > 0 && (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                {['المبلغ', 'الحالة', 'الدورة', 'التاريخ'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w, i) => (
                <Motion.tr
                  key={w.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td style={{ fontWeight: 700 }}>
                    {Number(w.amount).toFixed(2)} ج.م
                    {w.is_forced_settlement && (
                      <span className="badge badge-warning" style={{ marginInlineStart: '8px' }}>
                        تصفية تلقائية
                      </span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="orders-muted">#{w.cycle_number}</td>
                  <td className="orders-muted" style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                    {new Date(w.created_at).toLocaleDateString('ar-EG')}
                  </td>
                </Motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Team Leader Request Banner                                     */
/* ─────────────────────────────────────────────────────────────── */

function TeamLeaderBanner({ request, onRefresh }) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [nominateSuccessMsg, setNominateSuccessMsg] = useState(null);

  const { data: availableData, isLoading: availableLoading } = useQuery({
    queryKey: ['available-for-team'],
    queryFn: getAvailableForTeam,
    enabled: request?.status === 'accepted_pending_requirement',
  });
  const available = Array.isArray(availableData) ? availableData : (availableData?.results ?? []);

  const respondMutation = useMutation({
    mutationFn: (accepted) => respondToTeamLeaderRequest(request.id, accepted),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-team-leader-request'] });
      onRefresh?.();
    },
  });

  /**
   * ⚠️ تحديث: بدّلنا submitTeamForRequest (endpoint /submit-team/ القديم
   * اتلغى وبقى يرجع 404) بـ nominateTeamMembers — بيبعت دعوات pending
   * للمرشَّحين بدل ضمّهم مباشرة. مفيش حد أدنى 10 هنا لإرسال الترشيح؛
   * الترقية بتتم تلقائيًا في الباك إند لما عدد الموافقين يوصل الحد
   * الأدنى المطلوب. القائد يقدر يرشّح دفعات مختلفة أكتر من مرة على
   * نفس الطلب (مفيد لو حد رفض الدعوة).
   */
  const nominateMutation = useMutation({
    mutationFn: () => nominateTeamMembers(request.id, selectedIds),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['my-team-leader-request'] });
      qc.invalidateQueries({ queryKey: ['available-for-team'] });
      setSubmitError(null);
      const invitedCount = data?.invited_ids?.length ?? selectedIds.length;
      setNominateSuccessMsg(
        invitedCount > 0
          ? `تم إرسال ${invitedCount} دعوة بنجاح — في انتظار موافقة المرشَّحين. الترقية هتتم تلقائيًا لما 10 مسوقين يوافقوا.`
          : 'كل المرشَّحين المختارين مدعوين بالفعل.'
      );
      setSelectedIds([]);
      onRefresh?.();
    },
    onError: (err) => {
      const d = err?.response?.data;
      setSubmitError(
        typeof d === 'object' && d !== null
          ? Object.values(d).flat().join(' | ')
          : err?.message || 'حدث خطأ غير متوقع.'
      );
      setNominateSuccessMsg(null);
    },
  });

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filtered = available.filter(
    (m) =>
      m.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!request) return null;

  /* ── Awaiting response ── */
  if (request.status === 'awaiting_response') {
    return (
      <Motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="orders-surface"
        style={{
          marginBottom: '24px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--warning) 10%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))',
          border: '1.5px solid color-mix(in srgb, var(--warning) 32%, var(--border))',
        }}
        role="alert"
        aria-live="polite"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '30px' }}>🏆</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
              حققت الهدف الشهري!
            </p>
            <p className="orders-muted" style={{ margin: '0 0 16px', fontSize: '0.87rem' }}>
              هل تريد الترقية لـ Team Leader وتحصل على مكافآت إضافية على مبيعات فريقك؟
            </p>
            <div className="orders-actions">
              <button
                type="button"
                onClick={() => respondMutation.mutate(true)}
                disabled={respondMutation.isPending}
                className="orders-btn orders-btn--primary"
              >
                {respondMutation.isPending ? 'جارٍ…' : '✓ نعم، أريد الترقية'}
              </button>
              <button
                type="button"
                onClick={() => respondMutation.mutate(false)}
                disabled={respondMutation.isPending}
                className="orders-btn orders-btn--secondary"
              >
                لاحقًا
              </button>
            </div>
          </div>
        </div>
      </Motion.div>
    );
  }

  /* ── Accepted — pending team (نظام الترشيح/الدعوة) ── */
  if (request.status === 'accepted_pending_requirement') {
    return (
      <Motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="orders-surface"
        style={{
          marginBottom: '24px',
          padding: '20px 24px',
          background: 'color-mix(in srgb, var(--info) 6%, transparent)',
          border: '1.5px solid color-mix(in srgb, var(--info) 25%, var(--border))',
        }}
      >
        <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
          رشّح أعضاء فريقك
        </p>
        <p className="orders-muted" style={{ margin: '0 0 16px', fontSize: '0.85rem' }}>
          اختر أي عدد من المسوقين وابعتلهم دعوة انضمام — لازم يقبلوها هما بنفسهم. الترقية هتتم تلقائيًا
          لما عدد اللي يوافقوا يوصل{' '}
          <strong style={{ color: 'var(--accent)' }}>10 مسوقين</strong>. تقدر ترشّح دفعة تانية في أي وقت
          (مثلاً لو حد رفض الدعوة).{' '}
          <span>محدد الآن: {selectedIds.length}</span>
        </p>

        <FormError message={submitError} />
        <FormSuccess message={nominateSuccessMsg} />

        <input
          type="text"
          placeholder="بحث باسم المسوق أو كوده…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="orders-input"
          style={{ maxWidth: '320px', marginBottom: '12px' }}
        />

        {availableLoading && <SkeletonRows count={4} height={40} />}

        {!availableLoading && filtered.length === 0 && (
          <p className="orders-muted" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
            لا يوجد مسوقون متاحون حاليًا.
          </p>
        )}

        {!availableLoading && filtered.length > 0 && (
          <div
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              marginBottom: '16px',
            }}
          >
            {filtered.map((m) => {
              const sel = selectedIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => toggleSelect(m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: sel ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border-strong)'}`,
                      background: sel ? 'var(--accent)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {sel && <span style={{ color: 'var(--black)', fontSize: '11px', lineHeight: 1 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.user_name || m.referral_code}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      كود: {m.referral_code}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="orders-actions">
          <button
            type="button"
            onClick={() => nominateMutation.mutate()}
            disabled={nominateMutation.isPending || selectedIds.length === 0}
            className="orders-btn orders-btn--primary"
          >
            {nominateMutation.isPending
              ? 'جارٍ الإرسال…'
              : `إرسال الدعوات (${selectedIds.length})`}
          </button>
          {selectedIds.length === 0 && (
            <span className="orders-muted" style={{ fontSize: '0.8rem' }}>
              اختر مسوّقًا واحدًا على الأقل عشان تقدر ترشّح
            </span>
          )}
        </div>
      </Motion.div>
    );
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────── */
/*  Team Invitations Banner — دعوات الانضمام لفريق وصلت للمسوق     */
/*  (جديد) يظهر لأي مسوق — بغض النظر عن حالة طلب الترقية بتاعه —    */
/*  لو عنده دعوات pending وصلته من قائد فريق تاني.                 */
/* ─────────────────────────────────────────────────────────────── */

function TeamInvitationsBanner({ onRefresh }) {
  const qc = useQueryClient();
  const [respondingId, setRespondingId] = useState(null);
  const [bannerError, setBannerError] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-team-invitations'],
    queryFn: getMyTeamInvitations,
  });

  const invitations = Array.isArray(data) ? data : (data?.results ?? []);

  const respondMutation = useMutation({
    mutationFn: ({ id, accepted }) => respondToTeamInvitation(id, accepted),
    onMutate: ({ id }) => setRespondingId(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-team-invitations'] });
      qc.invalidateQueries({ queryKey: ['my-marketer-profile'] });
      setBannerError(null);
      setRespondingId(null);
      onRefresh?.();
    },
    onError: (err) => {
      const d = err?.response?.data;
      setBannerError(
        typeof d === 'object' && d !== null
          ? Object.values(d).flat().join(' | ')
          : err?.message || 'حدث خطأ غير متوقع.'
      );
      setRespondingId(null);
    },
  });

  /* لو مفيش دعوات (أو لسه بيحمّل / حصل خطأ في التحميل) منعرضش حاجة —
     البانر ده اختياري بحت ومفيش داعي يظهر Skeleton أو Error بيشغل مساحة
     لمعظم المسوقين اللي مفيش عندهم دعوات أصلاً. */
  if (isLoading || isError) return null;
  if (invitations.length === 0) return null;

  return (
    <Motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="orders-surface"
      style={{
        marginBottom: '24px',
        padding: '20px 24px',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--info) 8%, transparent), color-mix(in srgb, var(--success) 6%, transparent))',
        border: '1.5px solid color-mix(in srgb, var(--info) 28%, var(--border))',
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '30px' }}>📩</div>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
            عندك {invitations.length} دعوة انضمام لفريق
          </p>
          <p className="orders-muted" style={{ margin: '0 0 14px', fontSize: '0.87rem' }}>
            أحد قادة الفريق رشّحك للانضمام لفريقه. اقبل الدعوة عشان تنضم، أو ارفضها لو مش عايز.
          </p>

          <FormError message={bannerError} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {invitations.map((inv) => {
              const leaderName =
                inv.request?.marketer_name ||
                inv.request_marketer_name ||
                inv.leader_name ||
                inv.request?.marketer?.user_name ||
                'قائد فريق';
              const isBusy = respondingId === inv.id && respondMutation.isPending;
              return (
                <div
                  key={inv.id}
                  className="orders-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    دعوة من: {leaderName}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => respondMutation.mutate({ id: inv.id, accepted: true })}
                      disabled={isBusy}
                      className="orders-btn orders-btn--primary orders-btn--table"
                    >
                      {isBusy ? 'جارٍ…' : '✓ قبول'}
                    </button>
                    <button
                      type="button"
                      onClick={() => respondMutation.mutate({ id: inv.id, accepted: false })}
                      disabled={isBusy}
                      className="orders-btn orders-btn--secondary orders-btn--table"
                    >
                      رفض
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */

const TABS = [
  { key: 'overview',   label: 'نظرة عامة' },
  { key: 'new-order',  label: '+ تسجيل أوردر' },
  { key: 'orders',     label: 'سجل الأوردرات' },
  { key: 'withdraw',   label: 'سحب الأرباح' },
];

export default function MarketerDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['my-marketer-profile'],
    queryFn: getMyMarketerProfile,
  });

  const { data: leaderRequest, refetch: refetchLeaderRequest } = useQuery({
    queryKey: ['my-team-leader-request'],
    queryFn: getMyTeamLeaderRequest,
    retry: false,
  });

  const activeRequest = leaderRequest?.id ? leaderRequest : null;

  const handleOrderSuccess = useCallback(() => {
    setActiveTab('orders');
  }, []);

  return (
    <section className="orders-page">

      {/* ── Header ── */}
      <header className="orders-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Eyebrow>داشبورد المسوق</Eyebrow>
          <h1 className="orders-page__title">
            {profile ? `أهلاً، ${profile.user_name || 'المسوق'} 👋` : 'داشبورد المسوق'}
          </h1>
          {profile && (
            <p className="orders-page__subtitle" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>كود المسوق:</span>
              <strong style={{ color: 'var(--accent)', letterSpacing: '1px' }}>
                {profile.referral_code}
              </strong>
              <span className={`badge ${profile.role === 'team_leader' ? 'badge-warning' : 'badge-info'}`}>
                {profile.role === 'team_leader' ? '⭐ Team Leader' : 'مسوق'}
              </span>
            </p>
          )}
        </Motion.div>
      </header>

      {/* ── Profile loading/error ── */}
      {profileLoading && (
        <div style={{ marginBottom: '24px' }}>
          <SkeletonRows count={1} height={110} />
        </div>
      )}
      {profileError && (
        <div style={{ marginBottom: '24px' }}>
          <ErrorBox message="تعذّر تحميل بياناتك. تحقق من اتصالك." onRetry={refetchProfile} />
        </div>
      )}

      {/* ── Stats ── */}
      {profile && !profileLoading && <StatsRow profile={profile} />}

      {/* ── دعوات انضمام لفريق واصلة (لأي مسوق، بغض النظر عن طلب الترقية بتاعه) ── */}
      <TeamInvitationsBanner onRefresh={() => { refetchProfile(); }} />

      {/* ── Team Leader banner ── */}
      {activeRequest && (
        <TeamLeaderBanner
          request={activeRequest}
          onRefresh={() => { refetchLeaderRequest(); refetchProfile(); }}
        />
      )}

      {/* ── Tabs ── */}
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        role="tablist"
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
      >
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: active ? 800 : 500,
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap',
                fontSize: '0.88rem',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </Motion.div>

      {/* ── Tab panels ── */}
      <AnimatePresence mode="wait">
        <Motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'overview' && profile && (
            <OverviewTab profile={profile} onGoTo={setActiveTab} />
          )}

          {activeTab === 'new-order' && (
            <SectionCard style={{ padding: '24px' }}>
              <NewOrderForm onSuccess={handleOrderSuccess} />
            </SectionCard>
          )}

          {activeTab === 'orders' && (
            <SectionCard style={{ padding: '22px 24px' }}>
              <OrdersTab />
            </SectionCard>
          )}

          {activeTab === 'withdraw' && (
            <SectionCard style={{ padding: '22px 24px' }}>
              <WithdrawTab availableBalance={profile?.monthly_profit_balance ?? 0} />
            </SectionCard>
          )}
        </Motion.div>
      </AnimatePresence>
    </section>
  );
}