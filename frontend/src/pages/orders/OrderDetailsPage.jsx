import { Link, useParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useOrder, useUpdateOrderStatus } from '../../hooks/useOrders';
import { formatDate, formatMoney } from '../../components/orders/orderUtils';
import OrderStatusSelect from '../../components/orders/OrderStatusSelect';
import OrderTimeline from '../../components/orders/OrderTimeline';
import { downloadInvoicePdf, printInvoice } from '../../components/invoices/invoicePrint';
import './orders.css';

function toPrintableInvoice(order) {
  return {
    invoiceId: `ORD-${order.id}`,
    issueDate: order.createdAt,
    status: order.status,
    customerName: order.customerName,
    customerEmail: order.shipping_email || '',
    customerPhone: order.shipping_phone || '',
    customerAddress: order.shipping_address || '',
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.totalPrice,
    items: (order.products || []).map((item) => ({
      ...item,
      productName: item.name,
      total: Number(item.price || 0) * Number(item.quantity || 0),
    })),
  };
}

/* ─── Eyebrow label ─────────────────────────────────────────────── */
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

/* ─── Page ──────────────────────────────────────────────────────── */
export default function OrderDetailsPage() {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = async (nextStatus) => {
    if (!order || nextStatus === order.status) return;
    await updateStatus.mutateAsync({ orderId: order.id, status: nextStatus });
  };

  /* ── Loading ── */
  if (isLoading)
    return (
      <section className="orders-page">
        <div className="orders-skeleton">
          {[80, 240, 180].map((h, i) => (
            <Motion.div
              key={i}
              className="orders-skeleton-row"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </section>
    );

  /* ── Error ── */
  if (isError)
    return (
      <section className="orders-page">
        <div className="orders-error" role="alert">
          <p>{error instanceof Error ? error.message : tr('Unable to load order details.', 'تعذّر تحميل تفاصيل الطلب.')}</p>
          <button type="button" onClick={() => refetch()} className="orders-btn">
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      </section>
    );

  /* ── Not found ── */
  if (!order)
    return (
      <section className="orders-page">
        <p className="orders-empty">{tr('Order not found.', 'الطلب غير موجود.')}</p>
      </section>
    );

  const printableInvoice = toPrintableInvoice(order);

  return (
    <section className="orders-page order-details-page">

      {/* ── Header ── */}
      <header className="orders-page__header order-details-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Eyebrow>{tr('Phase 7', 'المرحلة 7')}</Eyebrow>
          <h1 className="orders-page__title">
            {tr('Order', 'طلب')} #{order.id}
          </h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr('Customer', 'العميل')}: <strong style={{ color: 'var(--text-primary)' }}>{order.customerName}</strong>
          </p>
        </Motion.div>

        <Motion.div
          className="order-details-page__actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Link to="/dashboard/orders" className="orders-btn orders-btn--secondary">
            ← {tr('Back to orders', 'العودة للطلبات')}
          </Link>
          <button
            type="button"
            className="orders-btn"
            onClick={() => downloadInvoicePdf(printableInvoice)}
          >
            {tr('Download Invoice', 'تنزيل الفاتورة')}
          </button>
          <button
            type="button"
            className="orders-btn orders-btn--primary"
            onClick={() => printInvoice(printableInvoice)}
          >
            {tr('Print Invoice', 'طباعة الفاتورة')}
          </button>
        </Motion.div>
      </header>

      {/* ── Body grid ── */}
      <div className="orders-details-grid order-details-page__grid">

        {/* Left column */}
        <div className="orders-stack">

          {/* Order info + timeline */}
          <Motion.article
            className="orders-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Eyebrow>{tr('Status', 'الحالة')}</Eyebrow>
            <h2 className="orders-section-title">{tr('Order Information', 'معلومات الطلب')}</h2>
            <div className="orders-info-grid" style={{ marginTop: '14px' }}>
              <div className="orders-row-between">
                <span className="orders-muted" style={{ fontSize: '0.8rem' }}>
                  {tr('Status', 'الحالة')}
                </span>
                <span
                  className={`status-badge status-badge--${order.status}`}
                >
                  {order.status}
                </span>
              </div>
              <div className="orders-row-between">
                <span className="orders-muted" style={{ fontSize: '0.8rem' }}>
                  {tr('Created', 'تاريخ الإنشاء')}
                </span>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                  {formatDate(order.createdAt)}
                </span>
              </div>
            </div>
            <OrderTimeline status={order.status} />
          </Motion.article>

          {/* Items table */}
          <Motion.article
            className="orders-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Eyebrow>{tr('Products', 'المنتجات')}</Eyebrow>
            <h2 className="orders-section-title">{tr('Items', 'العناصر')}</h2>
            <div className="orders-table-wrap" style={{ marginTop: '14px' }}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>{tr('Product', 'المنتج')}</th>
                    <th>{tr('Qty', 'الكمية')}</th>
                    <th>{tr('Price', 'السعر')}</th>
                    <th>{tr('Total', 'الإجمالي')}</th>
                  </tr>
                </thead>
                <tbody>
                  {!order.products?.length ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="orders-muted"
                        style={{ textAlign: 'center', padding: '24px' }}
                      >
                        {tr('No items found for this order.', 'لا توجد عناصر في هذا الطلب.')}
                      </td>
                    </tr>
                  ) : (
                    order.products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {product.name}
                          </div>
                          {(product.size || product.color) && (
                            <div className="orders-variant-meta">
                              {product.size && (
                                <span className="orders-variant-badge">📐 {product.size}</span>
                              )}
                              {product.color && (
                                <span className="orders-variant-badge">🎨 {product.color}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{product.quantity}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{formatMoney(product.price)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatMoney(Number(product.price || 0) * Number(product.quantity || 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Motion.article>
        </div>

        {/* Right column */}
        <aside className="orders-stack">

          {/* Update status */}
          <Motion.article
            className="orders-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <Eyebrow>{tr('Admin', 'الإدارة')}</Eyebrow>
            <h2 className="orders-section-title">{tr('Update Order', 'تحديث الطلب')}</h2>
            <div className="orders-status-select-wrap">
              <OrderStatusSelect
                value={order.status}
                onChange={handleStatusChange}
                loading={updateStatus.isPending}
              />
            </div>
            {updateStatus.isSuccess && (
              <div className="orders-feedback orders-feedback--success" style={{ marginTop: '10px' }}>
                {tr('Status updated successfully.', 'تم تحديث الحالة بنجاح.')}
              </div>
            )}
            {updateStatus.isError && (
              <div className="orders-feedback orders-feedback--error" style={{ marginTop: '10px' }}>
                {tr('Failed to update status.', 'فشل تحديث الحالة.')}
              </div>
            )}
          </Motion.article>

          {/* Price summary */}
          <Motion.article
            className="orders-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <Eyebrow>{tr('Pricing', 'التسعير')}</Eyebrow>
            <h2 className="orders-section-title">{tr('Summary', 'الملخص')}</h2>
            <div className="orders-price-grid" style={{ marginTop: '14px' }}>
              {[
                { label: tr('Subtotal', 'المجموع الفرعي'), value: formatMoney(order.subtotal) },
                { label: tr('Shipping', 'الشحن'), value: formatMoney(order.shipping) },
                { label: tr('Tax', 'الضريبة'), value: formatMoney(order.tax) },
                { label: tr('Discount', 'الخصم'), value: formatMoney(order.discount) },
              ].map(({ label, value }) => (
                <div key={label} className="orders-row-between">
                  <span className="orders-muted" style={{ fontSize: '0.85rem' }}>{label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{value}</span>
                </div>
              ))}
              <hr className="orders-divider" />
              <div className="orders-row-between orders-row-between--strong">
                <span style={{ letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                  {tr('Total', 'الإجمالي')}
                </span>
                <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {formatMoney(order.totalPrice)}
                </span>
              </div>
            </div>
          </Motion.article>

          {/* Shipping info */}
          {(order.shipping_address || order.shipping_phone || order.shipping_email) && (
            <Motion.article
              className="orders-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Eyebrow>{tr('Delivery', 'التوصيل')}</Eyebrow>
              <h2 className="orders-section-title">{tr('Shipping Info', 'معلومات الشحن')}</h2>
              <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                {[
                  { label: tr('Address', 'العنوان'), value: order.shipping_address },
                  { label: tr('Phone', 'الهاتف'), value: order.shipping_phone },
                  { label: tr('Email', 'البريد'), value: order.shipping_email },
                ]
                  .filter((f) => f.value)
                  .map(({ label, value }) => (
                    <div key={label} className="orders-row-between" style={{ alignItems: 'flex-start', gap: '12px' }}>
                      <span
                        className="orders-muted"
                        style={{ fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, flexShrink: 0 }}
                      >
                        {label}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: isRTL ? 'left' : 'right', wordBreak: 'break-word' }}>
                        {value}
                      </span>
                    </div>
                  ))}
              </div>
            </Motion.article>
          )}

        </aside>
      </div>
    </section>
  );
}