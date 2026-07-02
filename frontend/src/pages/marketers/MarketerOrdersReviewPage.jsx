// frontend/src/pages/marketers/MarketerOrdersReviewPage.jsx
// أهم صفحة عملياتية يومية لأدمن — مراجعة أوردرات المسوقين المعلقة
//
// ⚠️ تحديث (دعم أسطر متعددة): عمود "المنتج/الكمية/سعر البيع" استُبدل بعمودين
// "الأصناف" + "الإجمالي". الأصناف بتعرض كل items الأوردر لو كانت موجودة،
// مع fallback كامل للأوردرات القديمة (سطر واحد، حقول product_name/quantity
// المسطّحة) — مفيش أوردر قديم هيفضل من غير عرض صحيح.
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMarketerOrders, confirmMarketerOrder, rejectMarketerOrder } from '../../services/marketerAdminService';
import OrdersPagination from '../../components/orders/OrdersPagination';
import '../orders/orders.css';

const STATUS_LABELS = { pending: 'معلق', confirmed: 'مؤكد', rejected: 'مرفوض' };
const STATUS_COLORS = {
  pending:   { bg: 'rgba(234,179,8,0.15)',  color: '#eab308' },
  confirmed: { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
  rejected:  { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
};

const DEFAULT_FILTERS = { status: 'pending', search: '', page: 1, pageSize: 15 };

/* ─────────────────────────────────────────────────────────────────────────── */
/*  OrderItemsCell — عرض أصناف الأوردر (multi-item مع fallback للقديم)       */
/* ─────────────────────────────────────────────────────────────────────────── */

function OrderItemsCell({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];

  /* ── Fallback: أوردر قديم بسطر واحد مسطّح ── */
  if (items.length === 0) {
    return (
      <div style={{ fontSize: '12px' }}>
        <span style={{ fontWeight: 600 }}>
          {order.product_name || `منتج #${order.product}`}
        </span>
        <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>
          × {order.quantity}
        </span>
      </div>
    );
  }

  /* ── الأوردرات الجديدة: كل الأسطر ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map((it) => (
        <div key={it.id} style={{ fontSize: '12px' }}>
          <span style={{ fontWeight: 600 }}>
            {it.product_name || `#${it.product}`}
          </span>
          {(it.variant_color || it.variant_name) && (
            <span style={{ color: 'var(--text-muted)' }}>
              {' '}— {[it.variant_color, it.variant_size].filter(Boolean).join(' / ') || it.variant_name}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>
            × {it.quantity}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  OrderTotalCell — إجمالي سعر البيع (multi-item مع fallback للقديم)         */
/* ─────────────────────────────────────────────────────────────────────────── */

function OrderTotalCell({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length === 0) {
    /* fallback: سطر واحد قديم */
    const total = Number(order.sale_price_per_unit || 0) * Number(order.quantity || 0);
    return <span>{total.toFixed(2)} ج</span>;
  }

  const total = items.reduce(
    (sum, it) => sum + Number(it.subtotal ?? (Number(it.sale_price_per_unit) * Number(it.quantity))),
    0
  );
  return <span>{total.toFixed(2)} ج</span>;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Page                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function MarketerOrdersReviewPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [actionError, setActionError] = useState('');

  const queryParams = useMemo(() => ({
    status:    filters.status || undefined,
    search:    filters.search || undefined,
    page:      filters.page,
    page_size: filters.pageSize,
  }), [filters]);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['admin-marketer-orders', queryParams],
    queryFn: () => getMarketerOrders(queryParams),
    keepPreviousData: true,
    refetchInterval: filters.status === 'pending' ? 30_000 : false,
  });

  const confirmMutation = useMutation({
    mutationFn: confirmMarketerOrder,
    onSuccess: () => { qc.invalidateQueries(['admin-marketer-orders']); setActionError(''); },
    onError: (e) => setActionError(e?.response?.data?.detail || 'تعذّر تأكيد الأوردر.'),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectMarketerOrder,
    onSuccess: () => { qc.invalidateQueries(['admin-marketer-orders']); setActionError(''); },
    onError: (e) => setActionError(e?.response?.data?.detail || 'تعذّر رفض الأوردر.'),
  });

  const setFilter = (patch) => setFilters((p) => ({ ...p, ...patch, page: 1 }));
  const orders      = data?.results || data?.items || data || [];
  const total       = data?.count   || data?.total  || 0;
  const pendingCount = filters.status === 'pending' ? total : null;

  return (
    <section className="orders-page">

      {/* ── Header ── */}
      <header className="orders-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--accent)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
            ✦ نظام المسوقين
          </div>
          <h1 className="orders-page__title">
            مراجعة أوردرات المسوقين
            {pendingCount > 0 && (
              <span style={{ marginRight: '10px', background: '#eab308', color: '#000', borderRadius: '12px', padding: '2px 10px', fontSize: '13px', fontWeight: 800 }}>
                {pendingCount} معلق
              </span>
            )}
          </h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            تأكيد أو رفض أوردرات المسوقين — يتحدث تلقائياً كل 30 ثانية على تبويب "معلق"
          </p>
        </Motion.div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/dashboard/marketers" className="orders-btn orders-btn--secondary">← المسوقون</Link>
          <Link to="/dashboard" className="orders-btn orders-btn--secondary">الداشبورد</Link>
        </div>
      </header>

      {/* ── Filters ── */}
      <div className="orders-surface">
        <div className="orders-filters" style={{ gridTemplateColumns: '1fr auto' }}>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="orders-input"
            placeholder="بحث باسم المسوق أو المنتج…"
          />
          <select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })} className="orders-input">
            <option value="pending">معلق فقط</option>
            <option value="confirmed">مؤكد</option>
            <option value="rejected">مرفوض</option>
            <option value="">الكل</option>
          </select>
        </div>
      </div>

      {isFetching && !isLoading && (
        <p className="orders-refresh">✦ جارٍ التحديث…</p>
      )}

      {actionError && (
        <div className="orders-error" role="alert" style={{ marginBottom: '12px' }}>
          {actionError}
          <button type="button" onClick={() => setActionError('')} style={{ marginRight: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {isError && (
        <div className="orders-error" role="alert">
          <p>{error instanceof Error ? error.message : 'تعذّر تحميل الأوردرات.'}</p>
          <button type="button" onClick={() => refetch()} className="orders-btn">إعادة المحاولة</button>
        </div>
      )}

      {/* ── Table ── */}
      {!isError && (
        <Motion.div
          className="orders-surface"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>جارٍ التحميل…</div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
              <p style={{ color: 'var(--text-muted)' }}>
                {filters.status === 'pending' ? 'لا توجد أوردرات معلقة — كل حاجة مراجعة!' : 'لا توجد أوردرات مطابقة.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="orders-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المسوق</th>
                    <th>الأصناف</th>
                    <th>الإجمالي</th>
                    <th>الربح المحسوب</th>
                    <th>بيانات العميل</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    {(filters.status === 'pending' || filters.status === '') ? <th>إجراء</th> : null}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {orders.map((o) => {
                      const sc = STATUS_COLORS[o.status] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' };
                      const isActing = confirmMutation.variables === o.id || rejectMutation.variables === o.id;
                      return (
                        <Motion.tr
                          key={o.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ opacity: isActing ? 0.5 : 1 }}
                        >
                          <td style={{ fontWeight: 700, color: 'var(--accent)' }}>#{o.id}</td>

                          <td>
                            <Link to={`/dashboard/marketers/${o.marketer}`} style={{ color: 'var(--accent)' }}>
                              {o.marketer_name || `#${o.marketer}`}
                            </Link>
                          </td>

                          {/* ── الأصناف — multi-item مع fallback ── */}
                          <td style={{ minWidth: '200px' }}>
                            <OrderItemsCell order={o} />
                          </td>

                          {/* ── الإجمالي ── */}
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                            <OrderTotalCell order={o} />
                          </td>

                          <td style={{ fontWeight: 700, color: '#22c55e' }}>
                            {Number(o.profit_amount || 0).toFixed(2)} ج
                          </td>

                          <td style={{ fontSize: '12px' }}>
                            <div>{o.customer_name}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{o.customer_phone}</div>
                            {o.shipping_address && (
                              <div style={{ color: 'var(--text-muted)', marginTop: '2px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {o.shipping_address}
                              </div>
                            )}
                          </td>

                          <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {o.created_at ? new Date(o.created_at).toLocaleDateString('ar-EG') : '—'}
                          </td>

                          <td>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: sc.bg, color: sc.color }}>
                              {STATUS_LABELS[o.status] || o.status}
                            </span>
                          </td>

                          {(filters.status === 'pending' || filters.status === '') && (
                            <td>
                              {o.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    className="orders-btn"
                                    style={{ fontSize: '11px', padding: '5px 12px', background: '#22c55e', color: '#000', border: 'none' }}
                                    disabled={confirmMutation.isLoading || rejectMutation.isLoading}
                                    onClick={() => confirmMutation.mutate(o.id)}
                                  >
                                    ✓ تأكيد
                                  </button>
                                  <button
                                    className="orders-btn orders-btn--secondary"
                                    style={{ fontSize: '11px', padding: '5px 12px', color: '#ef4444' }}
                                    disabled={confirmMutation.isLoading || rejectMutation.isLoading}
                                    onClick={() => rejectMutation.mutate(o.id)}
                                  >
                                    ✕ رفض
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </Motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          <OrdersPagination
            page={filters.page}
            total={total}
            pageSize={filters.pageSize}
            onPageChange={(next) => setFilters((p) => ({ ...p, page: Math.max(1, next) }))}
          />
        </Motion.div>
      )}
    </section>
  );
}