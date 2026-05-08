import { Link, useParams } from 'react-router-dom';
import { useOrder, useUpdateOrderStatus } from '../../hooks/useOrders';
import { formatDate, formatMoney } from '../../components/orders/orderUtils';
import OrderStatusSelect from '../../components/orders/OrderStatusSelect';
import OrderTimeline from '../../components/orders/OrderTimeline';
import { downloadInvoicePdf, printInvoice } from '../../components/invoices/invoicePrint';
import './orders.css';

function toPrintableInvoice(order) {
  return {
    invoiceId: `ORD-${order.id}`,
    issueDate: order.createdAt,
    status: order.status,
    customerName: order.customerName,
    customerEmail: order.shipping_email || '',
    customerPhone: order.shipping_phone || '',
    customerAddress: order.shipping_address || '',
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.totalPrice,
    items: (order.products || []).map((item) => ({
      ...item,
      productName: item.name,
      total: Number(item.price || 0) * Number(item.quantity || 0),
    })),
  };
}

export default function OrderDetailsPage() {
  const { id } = useParams();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = async (nextStatus) => {
    if (!order || nextStatus === order.status) return;
    await updateStatus.mutateAsync({ orderId: order.id, status: nextStatus });
  };

  if (isLoading) return <section className="orders-page"><p className="orders-refresh">Loading order details...</p></section>;
  if (isError) return <section className="orders-page"><div className="orders-error" role="alert"><p>{error instanceof Error ? error.message : 'Unable to load order details.'}</p><button type="button" onClick={() => refetch()} className="orders-btn">Retry</button></div></section>;
  if (!order) return <section className="orders-page"><p className="orders-empty">Order not found.</p></section>;

  const printableInvoice = toPrintableInvoice(order);

  return (
    <section className="orders-page">
      <header className="orders-page__header">
        <div>
          <h1 className="orders-page__title">Order #{order.id}</h1>
          <p className="orders-page__subtitle">Customer: {order.customerName}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/dashboard/orders" className="orders-btn">Back to orders</Link>
          <button type="button" className="orders-btn" onClick={() => downloadInvoicePdf(printableInvoice)}>Download Invoice</button>
          <button type="button" className="orders-btn orders-btn--primary" onClick={() => printInvoice(printableInvoice)}>Print Invoice</button>
        </div>
      </header>

      <div className="orders-details-grid">
        <div className="orders-stack">
          <article className="orders-card">
            <h2 className="orders-section-title">Order Information</h2>
            <div className="orders-info-grid">
              <p><span className="orders-muted">Status:</span> {order.status}</p>
              <p><span className="orders-muted">Created:</span> {formatDate(order.createdAt)}</p>
            </div>
            <OrderTimeline status={order.status} />
          </article>

          <article className="orders-card">
            <h2 className="orders-section-title">Items</h2>
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {!order.products?.length ? <tr><td colSpan={4} className="orders-muted" style={{ textAlign: 'center' }}>No items found for this order.</td></tr> : order.products.map((product) => (
                    <tr key={product.id}><td>{product.name}</td><td>{product.quantity}</td><td>{formatMoney(product.price)}</td><td>{formatMoney(Number(product.price || 0) * Number(product.quantity || 0))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <aside className="orders-stack">
          <article className="orders-card">
            <h2 className="orders-section-title">Update Order</h2>
            <OrderStatusSelect value={order.status} onChange={handleStatusChange} loading={updateStatus.isPending} />
          </article>

          <article className="orders-card">
            <h2 className="orders-section-title">Summary</h2>
            <div className="orders-price-grid">
              <div className="orders-row-between"><span className="orders-muted">Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
              <div className="orders-row-between"><span className="orders-muted">Shipping</span><span>{formatMoney(order.shipping)}</span></div>
              <div className="orders-row-between"><span className="orders-muted">Tax</span><span>{formatMoney(order.tax)}</span></div>
              <div className="orders-row-between"><span className="orders-muted">Discount</span><span>{formatMoney(order.discount)}</span></div>
              <hr className="orders-divider" />
              <div className="orders-row-between orders-row-between--strong"><span>Total</span><span>{formatMoney(order.totalPrice)}</span></div>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}