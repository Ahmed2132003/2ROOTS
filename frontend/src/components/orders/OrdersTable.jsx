import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { formatDate, formatMoney } from './orderUtils';

function OrdersTableSkeleton() { return <div className="orders-skeleton" aria-hidden="true">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="orders-skeleton-row" />)}</div>; }

export default function OrdersTable({ orders, loading, onDelete, onUpdateStatus, onAddNote, activeAction }) {  
  if (loading) return <OrdersTableSkeleton />;
  if (!orders.length) return <div className="orders-empty">No orders found. Adjust the filters or search term.</div>;
  return (
    <div className="orders-table-wrap"><table className="orders-table"><thead><tr><th>Order ID</th><th>Customer Name</th><th>Total Price</th><th>Status</th><th>Created At</th><th>Actions</th></tr></thead><tbody>
      {orders.map((order) => {
        const busy = activeAction?.orderId === order.id;
        return (
          <tr key={order.id}><td><strong>{order.id}</strong></td><td>{order.customerName}</td><td>{formatMoney(order.totalPrice)}</td><td><StatusBadge status={order.status} /></td><td className="orders-muted">{formatDate(order.createdAt)}</td><td>
            <div className="orders-actions" role="group" aria-label={`Actions for order ${order.id}`}>
              <Link to={`/dashboard/orders/${order.id}`} className="orders-btn orders-btn--table">View</Link>
              <button type="button" className="orders-btn orders-btn--table orders-btn--primary" onClick={() => onUpdateStatus(order)} aria-label={`Update status for order ${order.id}`} disabled={busy}>{activeAction?.type === 'status' && busy ? 'Updating...' : 'Status'}</button>
              <button type="button" className="orders-btn orders-btn--table orders-btn--secondary" onClick={() => onAddNote(order)} aria-label={`Add note to order ${order.id}`} disabled={busy}>{activeAction?.type === 'note' && busy ? 'Saving...' : 'Note'}</button>
              <button type="button" className="orders-btn orders-btn--table orders-btn--danger" onClick={() => onDelete(order)} aria-label={`Delete order ${order.id}`} disabled={busy}>{activeAction?.type === 'delete' && busy ? 'Deleting...' : 'Delete'}</button>
            </div>
          </td></tr>
        );
      })}
    </tbody></table></div>
  );
}