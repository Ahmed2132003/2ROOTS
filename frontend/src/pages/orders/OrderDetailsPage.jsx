import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import OrderDetailsSkeleton from '../../components/orders/OrderDetailsSkeleton';
import OrderStatusSelect from '../../components/orders/OrderStatusSelect';
import OrderTimeline from '../../components/orders/OrderTimeline';
import StatusBadge from '../../components/orders/StatusBadge';
import { formatDate, formatMoney } from '../../components/orders/orderUtils';
import { useOrder, useUpdateOrderStatus } from '../../hooks/useOrders';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const [feedback, setFeedback] = useState(null);

  const handleStatusChange = async (status) => {
    setFeedback(null);

    try {
      await updateStatus.mutateAsync({ orderId: id, status });
      setFeedback({ type: 'success', message: 'Order status updated successfully.' });
    } catch (mutationError) {
      setFeedback({
        type: 'error',
        message: mutationError instanceof Error ? mutationError.message : 'Unable to update status.',
      });
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 text-white sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Order Details</h1>
          <p className="text-sm text-white/70">Review customer data, products, and fulfillment status.</p>
        </div>
        <Link to="/dashboard/orders" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/90">Back to orders</Link>
      </header>

      {isLoading && <OrderDetailsSkeleton />}

      {isError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100" role="alert">
          <p>{error instanceof Error ? error.message : 'Unable to load this order.'}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 rounded-md border border-rose-300/40 px-3 py-1.5">Retry</button>
        </div>
      )}

      {!isLoading && !isError && order && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{order.id}</p>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-sm text-white/70">Created {formatDate(order.createdAt)}</p>
              <p className="mt-2 text-sm text-white/80">Payment method: {order.paymentMethod}</p>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-base font-semibold">Customer Information</h2>
              <div className="mt-3 grid gap-2 text-sm text-white/80">
                <p><span className="text-white/60">Name:</span> {order.customer?.name || order.customerName}</p>
                <p><span className="text-white/60">Email:</span> {order.customer?.email || '-'}</p>
                <p><span className="text-white/60">Phone:</span> {order.customer?.phone || '-'}</p>
                <p><span className="text-white/60">Address:</span> {order.customer?.address || '-'}</p>
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-base font-semibold">Products</h2>
              <div className="mt-3 space-y-3">
                {(order.products || []).map((product) => (
                  <div key={product.id} className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
                    <img src={product.image} alt={product.name} className="h-14 w-14 rounded-md object-cover" />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-white/60">Qty: {product.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatMoney(product.price)}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <OrderTimeline status={order.status} />
            </article>
          </div>

          <aside className="space-y-5">
            <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-base font-semibold">Status Management</h2>
              <div className="mt-3">
                <OrderStatusSelect value={order.status} loading={updateStatus.isPending} onChange={handleStatusChange} />
              </div>

              {feedback && (
                <p className={`mt-3 rounded-md px-3 py-2 text-sm ${feedback.type === 'success' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`} role="status">
                  {feedback.message}
                </p>
              )}
            </article>

            <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-base font-semibold">Price Breakdown</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-white/70">Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/70">Shipping</span><span>{formatMoney(order.shipping)}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/70">Tax</span><span>{formatMoney(order.tax)}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/70">Discount</span><span>-{formatMoney(order.discount)}</span></div>
                <hr className="border-white/10" />
                <div className="flex items-center justify-between font-semibold"><span>Total</span><span>{formatMoney(order.totalPrice)}</span></div>
              </div>
            </article>
          </aside>
        </div>
      )}
    </section>
  );
}