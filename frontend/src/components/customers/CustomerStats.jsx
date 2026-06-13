import { useTranslation } from 'react-i18next';
import StatsCard from '../dashboard/StatsCard';
import { formatDate, formatMoney } from '../orders/orderUtils';

export default function CustomerStats({ totalOrders, totalSpent, lastOrderDate }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const stats = [
    {
      key: 'orders',
      title: tr('Total Orders', 'إجمالي الطلبات'),
      value: totalOrders ?? '—',
    },
    {
      key: 'sales',
      title: tr('Total Spent', 'إجمالي الإنفاق'),
      value: totalSpent != null ? formatMoney(totalSpent) : '—',
    },
    {
      key: 'customers',
      title: tr('Last Order', 'آخر طلب'),
      value: lastOrderDate ? formatDate(lastOrderDate) : tr('N/A', 'لا يوجد'),
    },
  ];

  return (
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))' }}>
      {stats.map((stat) => (
        <StatsCard
          key={stat.key + stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.key}
        />
      ))}
    </div>
  );
}