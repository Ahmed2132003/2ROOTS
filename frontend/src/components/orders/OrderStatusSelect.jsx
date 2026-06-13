import { useTranslation } from 'react-i18next';
import { ORDER_STATUSES } from '../../hooks/useOrders';

export default function OrderStatusSelect({ value, onChange, loading }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  return (
    <label className="orders-field-label">
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        {tr('Update Status', 'تحديث الحالة')}
      </span>
      <select
        className="orders-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        style={{ marginTop: '8px', width: '100%', opacity: loading ? 0.5 : 1 }}
      >
        {ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      {loading && (
        <span
          style={{
            fontSize: '0.72rem',
            color: 'var(--accent)',
            letterSpacing: '1px',
            marginTop: '6px',
            display: 'block',
          }}
        >
          {tr('Saving…', 'جارٍ الحفظ…')}
        </span>
      )}
    </label>
  );
}