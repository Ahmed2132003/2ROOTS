import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import { useDeleteOrder, useOrders, useUpdateOrderStatus } from '../../hooks/useOrders';
import OrderFilters from '../../components/orders/OrderFilters';
import OrdersPagination from '../../components/orders/OrdersPagination';
import OrdersTable from '../../components/orders/OrdersTable';
import './orders.css';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  sortBy: 'dateDesc',
  dateFrom: '',
  dateTo: '',
  page: 1,
  pageSize: 8,
};

export default function OrdersListPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeAction, setActiveAction] = useState({ type: null, orderId: null });

  const queryFilters = useMemo(() => filters, [filters]);
  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(queryFilters);
  const deleteOrder = useDeleteOrder();
  const updateStatus = useUpdateOrderStatus();

  const setPage = (next) =>
    setFilters((prev) => ({ ...prev, page: Math.max(1, next) }));

  /* ── Handlers ── */
  const handleDelete = async (order) => {
    if (!window.confirm(`${tr('Delete order', 'حذف الطلب')} #${order.id}?`)) return;
    setActiveAction({ type: 'delete', orderId: order.id });
    try {
      await deleteOrder.mutateAsync(order.id);
    } finally {
      setActiveAction({ type: null, orderId: null });
    }
  };

  const handleStatus = async (order, status) => {
    setActiveAction({ type: 'status', orderId: order.id });
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status });
    } finally {
      setActiveAction({ type: null, orderId: null });
    }
  };

  const handleNote = async (order, note) => {
    if (!note?.trim()) return;
    setActiveAction({ type: 'note', orderId: order.id });
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: order.status, note });
    } finally {
      setActiveAction({ type: null, orderId: null });
    }
  };

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
          <h1 className="orders-page__title">{tr('Orders', 'الطلبات')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr('Search, filter, and monitor all order activity.', 'ابحث وفلتر وراقب كل نشاط الطلبات.')}
          </p>
        </Motion.div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/dashboard/orders/new" className="orders-btn orders-btn--primary">
            + {tr('New Order', 'طلب جديد')}
          </Link>
          <Link to="/dashboard" className="orders-btn orders-btn--secondary">
            {tr('Dashboard', 'الداشبورد')}
          </Link>
        </div>
      </header>

      {/* ── Filters ── */}
      <div className="orders-surface">
        <OrderFilters filters={filters} onChange={setFilters} />
      </div>

      {/* ── Refreshing ── */}
      {isFetching && !isLoading && (
        <p className="orders-refresh">✦ {tr('Refreshing…', 'جارٍ التحديث…')}</p>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="orders-error" role="alert">
          <p>{error instanceof Error ? error.message : tr('Unable to load orders.', 'تعذّر تحميل الطلبات.')}</p>
          <button type="button" onClick={() => refetch()} className="orders-btn">
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {/* ── Table + Pagination ── */}
      {!isError && (
        <Motion.div
          className="orders-surface"
          style={{ display: 'grid', gap: '16px' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <OrdersTable
            orders={data?.items || []}
            loading={isLoading}
            onDelete={handleDelete}
            onUpdateStatus={handleStatus}
            onAddNote={handleNote}
            activeAction={activeAction}
          />
          <OrdersPagination
            page={filters.page}
            total={data?.total || 0}
            pageSize={filters.pageSize}
            onPageChange={setPage}
          />
        </Motion.div>
      )}

    </section>
  );
}