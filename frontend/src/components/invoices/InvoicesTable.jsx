import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatDate, formatMoney } from '../orders/orderUtils';
import InvoiceStatusBadge from './InvoiceStatusBadge';

/* ─── Skeleton ──────────────────────────────────────────────── */
function InvoicesTableSkeleton() {
  return (
    <div className="orders-skeleton" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <Motion.div
          key={i}
          className="orders-skeleton-row"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
          style={{ height: '52px' }}
        />
      ))}
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────── */
export default function InvoicesTable({ invoices, loading, onDownload, onPrint }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  if (loading) return <InvoicesTableSkeleton />;

  if (!invoices.length)
    return (
      <div className="orders-empty">
        {tr('No invoices found.', 'لا توجد فواتير.')}
      </div>
    );

  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <thead>
          <tr>
            <th>{tr('Invoice ID', 'رقم الفاتورة')}</th>
            <th>{tr('Customer', 'العميل')}</th>
            <th>{tr('Order ID', 'رقم الطلب')}</th>
            <th>{tr('Total', 'الإجمالي')}</th>
            <th>{tr('Status', 'الحالة')}</th>
            <th>{tr('Issue Date', 'تاريخ الإصدار')}</th>
            <th>{tr('Actions', 'الإجراءات')}</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <span
                  style={{
                    fontFamily: 'Bebas Neue, sans-serif',
                    fontSize: '1rem',
                    letterSpacing: '1px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {invoice.invoiceId}
                </span>
              </td>

              <td style={{ color: 'var(--text-primary)' }}>{invoice.customerName}</td>

              <td style={{ color: 'var(--text-secondary)' }}>
                {invoice.orderId
                  ? <Link to={`/dashboard/orders/${invoice.orderId}`} className="orders-link">#{invoice.orderId}</Link>
                  : <span className="orders-muted">—</span>}
              </td>

              <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatMoney(invoice.total)}
              </td>

              <td><InvoiceStatusBadge status={invoice.status} /></td>

              <td className="orders-muted" style={{ fontSize: '0.82rem' }}>
                {formatDate(invoice.issueDate)}
              </td>

              <td>
                <div className="orders-actions">
                  <Link
                    to={`/dashboard/invoices/${invoice.id}`}
                    className="orders-btn orders-btn--table orders-btn--secondary"
                  >
                    {tr('View', 'عرض')}
                  </Link>
                  <button
                    type="button"
                    className="orders-btn orders-btn--table"
                    onClick={() => onDownload(invoice)}
                  >
                    {tr('PDF', 'تنزيل')}
                  </button>
                  <button
                    type="button"
                    className="orders-btn orders-btn--table orders-btn--primary"
                    onClick={() => onPrint(invoice)}
                  >
                    {tr('Print', 'طباعة')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}