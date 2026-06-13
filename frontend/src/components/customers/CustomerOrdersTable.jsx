import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import StatusBadge from '../orders/StatusBadge';
import { formatDate, formatMoney } from '../orders/orderUtils';

export default function CustomerOrdersTable({ orders, loading }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  if (loading)
    return (
      <div className="orders-skeleton" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
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

  if (!orders.length)
    return (
      <div className="orders-empty">
        {tr('No orders found for this customer.', 'لا توجد طلبات لهذا العميل.')}
      </div>
    );

  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <thead>
          <tr>
            <th>{tr('Order ID', 'رقم الطلب')}</th>
            <th>{tr('Date', 'التاريخ')}</th>
            <th>{tr('Status', 'الحالة')}</th>
            <th>{tr('Total', 'الإجمالي')}</th>
            <th>{tr('Action', 'الإجراء')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <span
                  style={{
                    fontFamily: 'Bebas Neue, sans-serif',
                    fontSize: '1rem',
                    letterSpacing: '1px',
                    color: 'var(--text-primary)',
                  }}
                >
                  #{order.id}
                </span>
              </td>
              <td className="orders-muted" style={{ fontSize: '0.82rem' }}>
                {formatDate(order.createdAt)}
              </td>
              <td><StatusBadge status={order.status} /></td>
              <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatMoney(order.totalPrice)}
              </td>
              <td>
                <Link
                  to={`/dashboard/orders/${order.id}`}
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