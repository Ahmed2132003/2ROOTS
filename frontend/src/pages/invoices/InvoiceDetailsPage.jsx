import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import InvoiceStatusBadge from '../../components/invoices/InvoiceStatusBadge';
import { useInvoice } from '../../hooks/useInvoices';
import { formatDate, formatMoney } from '../../components/orders/orderUtils';
import { downloadInvoicePdf, printInvoice } from '../../components/invoices/invoicePrint';
import companyInfo from '../../config/companyInfo';
import '../orders/orders.css';

/* ─── Info field row ────────────────────────────────────────── */
function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.88rem',
          textAlign: 'right',
          wordBreak: 'break-word',
          maxWidth: '60%',
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

/* ─── Eyebrow ───────────────────────────────────────────────── */
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

/* ─── Page ──────────────────────────────────────────────────── */
export default function InvoiceDetailsPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const { id } = useParams();
  const { data: invoice, isLoading, isError, error, refetch } = useInvoice(id);

  return (
    <section className="orders-page invoice-page">

      {/* ── Header ── */}
      <header className="orders-page__header invoice-page__controls no-print">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Eyebrow>{tr('Phase 9', 'المرحلة 9')}</Eyebrow>
          <h1 className="orders-page__title">{tr('Invoice Details', 'تفاصيل الفاتورة')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr('Review invoice and customer billing data.', 'راجع الفاتورة وبيانات فوترة العميل.')}
          </p>
        </Motion.div>

        <Motion.div
          style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
        >
          <Link to="/dashboard/invoices" className="orders-btn orders-btn--secondary">
            ← {tr('Back', 'رجوع')}
          </Link>
          {invoice && (
            <>
              <button
                type="button"
                className="orders-btn"
                onClick={() => downloadInvoicePdf(invoice)}
              >
                {tr('Download PDF', 'تنزيل PDF')}
              </button>
              <button
                type="button"
                className="orders-btn orders-btn--primary"
                onClick={() => printInvoice(invoice)}
              >
                {tr('Print', 'طباعة')}
              </button>
            </>
          )}
        </Motion.div>
      </header>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="orders-skeleton" aria-hidden="true">
          {[80, 140, 140, 220].map((h, i) => (
            <Motion.div
              key={i}
              className="orders-skeleton-row"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="orders-error" role="alert">
          <p>
            {error instanceof Error
              ? error.message
              : tr('Unable to load this invoice.', 'تعذّر تحميل هذه الفاتورة.')}
          </p>
          <button type="button" onClick={() => refetch()} className="orders-btn">
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {!isLoading && !isError && invoice && (
        <Motion.div
          className="orders-details-grid invoice-print-area"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {/* Left column */}
          <div className="orders-stack">

            {/* Invoice header card */}
            <article className="orders-card invoice-header-card">
              <div className="invoice-branding">
                <p className="invoice-logo" aria-label="2ROOTS">2ROOTS</p>
                <div>
                  <p
                    style={{
                      fontFamily: 'Bebas Neue, sans-serif',
                      fontSize: '1rem',
                      letterSpacing: '1.5px',
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}
                  >
                    {invoice.invoiceId}
                  </p>
                  <p className="orders-muted" style={{ fontSize: '0.8rem' }}>
                    {tr('Issued', 'صادرة')} {formatDate(invoice.issueDate)}
                  </p>
                  {invoice.orderId && (
                    <p style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                      {tr('Order', 'طلب')}:{' '}
                      <Link
                        to={`/dashboard/orders/${invoice.orderId}`}
                        className="orders-link"
                      >
                        #{invoice.orderId}
                      </Link>
                    </p>
                  )}
                </div>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </article>

            {/* Company info */}
            <article className="orders-card">
              <Eyebrow>{tr('From', 'من')}</Eyebrow>
              <h2 className="orders-section-title">{tr('Company Information', 'معلومات الشركة')}</h2>
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)' }}>
                <InfoRow label={tr('Name', 'الاسم')} value={companyInfo.companyName} />
                <InfoRow label={tr('Email', 'البريد')} value={companyInfo.email} />
                <InfoRow label={tr('Phone', 'الهاتف')} value={companyInfo.phone} />
                <InfoRow label={tr('Address', 'العنوان')} value={companyInfo.address} />
              </div>
            </article>

            {/* Customer info */}
            <article className="orders-card">
              <Eyebrow>{tr('To', 'إلى')}</Eyebrow>
              <h2 className="orders-section-title">{tr('Customer Information', 'معلومات العميل')}</h2>
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)' }}>
                <InfoRow label={tr('Name', 'الاسم')} value={invoice.customerName} />
                <InfoRow label={tr('Email', 'البريد')} value={invoice.customerEmail} />
                <InfoRow label={tr('Phone', 'الهاتف')} value={invoice.customerPhone} />
                <InfoRow label={tr('Address', 'العنوان')} value={invoice.customerAddress} />
              </div>
            </article>

            {/* Items table */}
            <article className="orders-card">
              <Eyebrow>{tr('Products', 'المنتجات')}</Eyebrow>
              <h2 className="orders-section-title">{tr('Itemized Products', 'المنتجات المفصّلة')}</h2>
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
                    {(invoice.items || []).length ? (
                      invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.productName || '—'}
                            </div>
                            {(item.size || item.color) && (
                              <div className="orders-variant-meta">
                                {item.size && <span className="orders-variant-badge">📐 {item.size}</span>}
                                {item.color && <span className="orders-variant-badge">🎨 {item.color}</span>}
                              </div>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{item.quantity || 0}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {formatMoney(item.price || item.unit_price || 0)}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatMoney(item.total || item.subtotal || 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="orders-muted"
                          style={{ textAlign: 'center', padding: '24px' }}
                        >
                          {tr('No product lines available.', 'لا توجد بنود منتجات.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          {/* Right column — summary */}
          <aside className="orders-stack">
            <article className="orders-card">
              <Eyebrow>{tr('Pricing', 'التسعير')}</Eyebrow>
              <h2 className="orders-section-title">{tr('Invoice Summary', 'ملخص الفاتورة')}</h2>
              <div className="orders-price-grid" style={{ marginTop: '14px' }}>
                {[
                  { label: tr('Subtotal', 'المجموع الفرعي'), value: formatMoney(invoice.subtotal) },
                  { label: tr('Discount', 'الخصم'), value: `-${formatMoney(invoice.discount || 0)}` },
                  { label: tr('Shipping', 'الشحن'), value: formatMoney(invoice.shipping || 0) },
                  { label: tr('Taxes', 'الضرائب'), value: formatMoney(invoice.tax) },
                ].map(({ label, value }) => (
                  <div key={label} className="orders-row-between">
                    <span className="orders-muted" style={{ fontSize: '0.85rem' }}>{label}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{value}</span>
                  </div>
                ))}
                <hr className="orders-divider" />
                <div className="orders-row-between orders-row-between--strong">
                  <span style={{ letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                    {tr('Total Amount', 'الإجمالي الكلي')}
                  </span>
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    {formatMoney(invoice.total)}
                  </span>
                </div>
              </div>
            </article>
          </aside>
        </Motion.div>
      )}
    </section>
  );
}