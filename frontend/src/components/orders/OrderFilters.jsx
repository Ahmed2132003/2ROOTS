import { useTranslation } from 'react-i18next';
import { ORDER_STATUSES } from '../../hooks/useOrders';

const SORT_OPTIONS = [
  { value: 'dateDesc',  en: 'Newest first',       ar: 'الأحدث أولاً' },
  { value: 'dateAsc',   en: 'Oldest first',        ar: 'الأقدم أولاً' },
  { value: 'priceDesc', en: 'Price: high to low',  ar: 'السعر: من الأعلى' },
  { value: 'priceAsc',  en: 'Price: low to high',  ar: 'السعر: من الأدنى' },
];

export default function OrderFilters({ filters, onChange }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const set = (patch) => onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="orders-filters">
      {/* Search */}
      <input
        type="search"
        value={filters.search}
        onChange={(e) => set({ search: e.target.value })}
        className="orders-input"
        placeholder={tr('Search by Order ID or customer', 'بحث برقم الطلب أو العميل')}
      />

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => set({ status: e.target.value })}
        className="orders-select"
      >
        <option value="all">{tr('All statuses', 'كل الحالات')}</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={filters.sortBy}
        onChange={(e) => set({ sortBy: e.target.value })}
        className="orders-select"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{isRTL ? o.ar : o.en}</option>
        ))}
      </select>

      {/* Date range */}
      <input
        type="date"
        value={filters.dateFrom || ''}
        onChange={(e) => set({ dateFrom: e.target.value })}
        className="orders-input"
        aria-label={tr('From date', 'من تاريخ')}
      />
      <input
        type="date"
        value={filters.dateTo || ''}
        onChange={(e) => set({ dateTo: e.target.value })}
        className="orders-input"
        aria-label={tr('To date', 'إلى تاريخ')}
      />
    </div>
  );
}