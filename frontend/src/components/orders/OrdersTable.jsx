import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { formatDate, formatMoney } from './orderUtils';

function OrdersTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-lg bg-white/5" />
      ))}
    </div>
  );
}

export default function OrdersTable({ orders, loading }) {
  if (loading) {
    return <OrdersTableSkeleton />;
  }

  if (!orders.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-8 text-center text-sm text-white/70">
        No orders found. Adjust the filters or search term.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-white/70">
          <tr>
            <th className="px-4 py-3">Order ID</th>
            <th className="px-4 py-3">Customer Name</th>
            <th className="px-4 py-3">Total Price</th>
            <th className="px-4 py-3">Payment Method</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created At</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-white/10 hover:bg-white/[0.03]">
              <td className="whitespace-nowrap px-4 py-3 font-semibold">{order.id}</td>
              <td className="whitespace-nowrap px-4 py-3">{order.customerName}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatMoney(order.totalPrice)}</td>
              <td className="whitespace-nowrap px-4 py-3">{order.paymentMethod}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={order.status} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-white/70">{formatDate(order.createdAt)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Link to={`/dashboard/orders/${order.id}`} className="text-violet-300 transition hover:text-violet-200">
                  View details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}