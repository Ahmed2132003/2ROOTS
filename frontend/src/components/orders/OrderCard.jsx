import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
import { formatDate, formatMoney } from './orderUtils';

export default function OrderCard({ order }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  return (
    <article className="orders-card">
      {/* Header row */}
      <div className="orders-row-between">
        <span
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '1.1rem',
            letterSpacing: '1.5px',
            color: 'var(--text-primary)',
          }}
        >
          #{order.id}
        </span>
        <StatusBadge status={order.status} />
      </div>

      {/* Info */}
      <div className="orders-info-grid" style={{ marginTop: '12px' }}>
        <div className="orders-row-between">
          <span className="orders-muted" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>
            {tr('Order Date', 'تاريخ الطلب')}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {formatDate(order.createdAt)}
          </span>
        </div>
        <div className="orders-row-between">
          <span className="orders-muted" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>
            {tr('Total', 'الإجمالي')}
          </span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatMoney(order.totalPrice)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Link to={`/track-order/${order.id}`} className="orders-btn orders-btn--primary">
          {tr('Track Order', 'تتبع الطلب')}
        </Link>
        <Link to={`/orders/${order.id}`} className="orders-btn orders-btn--secondary">
          {tr('Details', 'التفاصيل')}
        </Link>
      </div>
    </article>
  );
}