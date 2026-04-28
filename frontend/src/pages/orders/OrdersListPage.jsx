import { useMemo, useState } from 'react';
import { useOrders } from '../../hooks/useOrders';
import OrderFilters from '../../components/orders/OrderFilters';
import OrdersPagination from '../../components/orders/OrdersPagination';
import OrdersTable from '../../components/orders/OrdersTable';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  sortBy: 'dateDesc',
  page: 1,
  pageSize: 8,
};

export default function OrdersListPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const queryFilters = useMemo(() => filters, [filters]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useOrders(queryFilters);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 text-white sm:px-6">
      <header>
        <h1 className="text-2xl font-bold">Orders Management</h1>
        <p className="text-sm text-white/70">Search, filter, and monitor all order activity.</p>
      </header>

      <OrderFilters filters={filters} onChange={setFilters} />

      {isFetching && !isLoading && (
        <p className="text-xs text-violet-200">Refreshing orders...</p>
      )}

      {isError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100" role="alert">
          <p>{error instanceof Error ? error.message : 'Unable to load orders.'}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 rounded-md border border-rose-300/40 px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : (
        <>
          <OrdersTable orders={data?.items || []} loading={isLoading} />
          <OrdersPagination
            page={filters.page}
            total={data?.total || 0}
            pageSize={filters.pageSize}
            onPageChange={(nextPage) => setFilters((previous) => ({ ...previous, page: Math.max(1, nextPage) }))}
          />
        </>
      )}
    </section>
  );
}