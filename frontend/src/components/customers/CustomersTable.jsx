import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatDate, formatMoney } from '../orders/orderUtils';

/* ─── Skeleton ──────────────────────────────────────────────── */
function CustomersTableSkeleton() {
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
export default function CustomersTable({ customers, loading }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  if (loading) return <CustomersTableSkeleton />;

  if (!customers.length)
    return (
      <div className="orders-empty">
        {tr('No customers found. Adjust your search term.', 'لا يوجد عملاء. عدّل مصطلح البحث.')}
      </div>
    );

  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <thead>
          <tr>
            <th>{tr('Customer', 'العميل')}</th>
            <th>{tr('Email', 'البريد')}</th>
            <th>{tr('Phone', 'الهاتف')}</th>
            <th>{tr('Address', 'العنوان')}</th>
            <th>{tr('Orders', 'الطلبات')}</th>
            <th>{tr('Total Spent', 'إجمالي الإنفاق')}</th>
            <th>{tr('Joined', 'منذ')}</th>
            <th>{tr('Actions', 'الإجراءات')}</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {customer.fullName}
                </strong>
              </td>

              <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {customer.email || <span className="orders-muted">—</span>}
              </td>

              <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {customer.phone || <span className="orders-muted">—</span>}
              </td>

              <td
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={customer.address}
              >
                {customer.address || <span className="orders-muted">—</span>}
              </td>

              <td style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                {customer.totalOrders}
              </td>

              <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatMoney(customer.totalSpent)}
              </td>

              <td className="orders-muted" style={{ fontSize: '0.82rem' }}>
                {formatDate(customer.createdAt)}
              </td>

              <td>
                <Link
                  to={`/dashboard/customers/${customer.id}`}
                  className="orders-btn orders-btn--table orders-btn--secondary"
                >
                  {tr('View', 'عرض')}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}