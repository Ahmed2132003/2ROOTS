import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDeleteOrder, useOrders, useUpdateOrderStatus } from '../../hooks/useOrders';
import OrderFilters from '../../components/orders/OrderFilters';
import OrdersPagination from '../../components/orders/OrdersPagination';
import OrdersTable from '../../components/orders/OrdersTable';
import './orders.css';

const DEFAULT_FILTERS = { search: '', status: 'all', sortBy: 'dateDesc', dateFrom: '', dateTo: '', page: 1, pageSize: 8 };

export default function OrdersListPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const queryFilters = useMemo(() => filters, [filters]);
  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(queryFilters);
  const deleteOrder = useDeleteOrder();
  const updateStatus = useUpdateOrderStatus();

  const handleDelete = async (order) => { if (!window.confirm(`Delete order #${order.id}?`)) return; await deleteOrder.mutateAsync(order.id); };
  const handleStatus = async (order) => { const status = window.prompt('Enter status: pending/confirmed/shipped/delivered/cancelled', order.status); if (!status) return; await updateStatus.mutateAsync({ orderId: order.id, status }); };
  const handleNote = async (order) => { const note = window.prompt('Add admin note'); if (!note) return; await updateStatus.mutateAsync({ orderId: order.id, status: order.status, note }); };


  return (<section className="orders-page"><header className="orders-page__header"><div><h1 className="orders-page__title">Orders Management</h1><p className="orders-page__subtitle">Search, filter, and monitor all order activity.</p></div><div style={{display:'flex',gap:12}}><Link to="/dashboard/orders/new" className="orders-btn orders-btn--primary">New Order</Link><Link to="/dashboard" className="orders-btn">Back to dashboard</Link></div></header>
    <div className="orders-surface"><OrderFilters filters={filters} onChange={setFilters} /></div>
    {isFetching && !isLoading && <p className="orders-refresh">Refreshing orders...</p>}
    {isError ? <div className="orders-error" role="alert"><p>{error instanceof Error ? error.message : 'Unable to load orders.'}</p><button type="button" onClick={() => refetch()} className="orders-btn">Retry</button></div> : <div className="orders-surface"><OrdersTable orders={data?.items || []} loading={isLoading} onDelete={handleDelete} onUpdateStatus={handleStatus} onAddNote={handleNote} /><OrdersPagination page={filters.page} total={data?.total || 0} pageSize={filters.pageSize} onPageChange={(nextPage) => setFilters((previous) => ({ ...previous, page: Math.max(1, nextPage) }))} /></div>}
  </section>);
}