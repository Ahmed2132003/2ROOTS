import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import CustomersTable from '../../components/customers/CustomersTable';
import OrdersPagination from '../../components/orders/OrdersPagination';
import { useCustomers } from '../../hooks/useCustomers';
import '../orders/orders.css';

const DEFAULT_FILTERS = { search: '', page: 1, pageSize: 8 };

export default function CustomersListPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const queryFilters = useMemo(() => filters, [filters]);
  const { data, isLoading, isError, error, isFetching, refetch } = useCustomers(queryFilters);

  const setFilter = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <section className="orders-page">

      {/* ── Header ── */}
      <header className="orders-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
            ✦ {tr('Phase 9', 'المرحلة 9')}
          </div>
          <h1 className="orders-page__title">{tr('Customers', 'العملاء')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr('Search and review your customer base.', 'ابحث في قاعدة عملائك وراجعها.')}
          </p>
        </Motion.div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/dashboard/orders" className="orders-btn orders-btn--secondary">
            {tr('Orders', 'الطلبات')}
          </Link>
          <Link to="/dashboard" className="orders-btn orders-btn--secondary">
            {tr('Dashboard', 'الداشبورد')}
          </Link>
        </div>
      </header>

      {/* ── Search ── */}
      <div className="orders-surface">
        <div className="orders-filters" style={{ gridTemplateColumns: '1fr' }}>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value, page: 1 })}
            className="orders-input"
            placeholder={tr('Search by name, email, or phone…', 'بحث بالاسم أو البريد أو الهاتف…')}
          />
        </div>
      </div>

      {/* ── Refreshing indicator ── */}
      {isFetching && !isLoading && (
        <p className="orders-refresh">
          ✦ {tr('Refreshing…', 'جارٍ التحديث…')}
        </p>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="orders-error" role="alert">
          <p>{error instanceof Error ? error.message : tr('Unable to load customers.', 'تعذّر تحميل العملاء.')}</p>
          <button type="button" onClick={() => refetch()} className="orders-btn">
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {!isError && (
        <Motion.div
          className="orders-surface"
          style={{ display: 'grid', gap: '16px' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <CustomersTable customers={data?.items || []} loading={isLoading} />
          <OrdersPagination
            page={filters.page}
            total={data?.total || 0}
            pageSize={filters.pageSize}
            onPageChange={(next) => setFilter({ page: Math.max(1, next) })}
          />
        </Motion.div>
      )}

    </section>
  );
}