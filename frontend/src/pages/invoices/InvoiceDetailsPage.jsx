import { Link, useParams } from 'react-router-dom';
import InvoiceStatusBadge from '../../components/invoices/InvoiceStatusBadge';
import { useInvoice } from '../../hooks/useInvoices';
import { formatDate, formatMoney } from '../../components/orders/orderUtils';
import { downloadInvoicePdf, printInvoice } from '../../components/invoices/invoicePrint';
import companyInfo from '../../config/companyInfo';
import '../orders/orders.css';

export default function InvoiceDetailsPage() {
  const { id } = useParams();
  const { data: invoice, isLoading, isError, error, refetch } = useInvoice(id);

  return (
    <section className="orders-page invoice-page">
      <header className="orders-page__header invoice-page__controls no-print">
        <div>
          <h1 className="orders-page__title">Invoice Details</h1>
          <p className="orders-page__subtitle">Review invoice details and customer billing data.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/dashboard/invoices" className="orders-btn">Back to invoices</Link>
          {invoice && (
            <>
              <button type="button" className="orders-btn" onClick={() => downloadInvoicePdf(invoice)}>Download PDF</button>
              <button type="button" className="orders-btn orders-btn--primary" onClick={() => printInvoice(invoice)}>Print</button>
            </>
          )}
        </div>
      </header>

      {isLoading && <div className="orders-skeleton" aria-hidden="true">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="orders-skeleton-row" />)}</div>}
      {isError && <div className="orders-error" role="alert"><p>{error instanceof Error ? error.message : 'Unable to load this invoice.'}</p><button type="button" onClick={() => refetch()} className="orders-btn">Retry</button></div>}

      {!isLoading && !isError && invoice && (
        <div className="orders-details-grid invoice-print-area">
          <div className="orders-stack">
            <article className="orders-card invoice-header-card">
              <div className="invoice-branding">
                <p className="invoice-logo">🦈 SHARK</p>
                <div>
                  <p className="orders-id-label">{invoice.invoiceId}</p>
                  <p className="orders-muted">Issued {formatDate(invoice.issueDate)}</p>
                  <p className="orders-subline">Related Order: {invoice.orderId || '-'}</p>
                </div>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </article>

            <article className="orders-card">
              <h2 className="orders-section-title">Company Information</h2>
              <div className="orders-info-grid">
                <p><span className="orders-muted">Name:</span> {companyInfo.companyName}</p>
                <p><span className="orders-muted">Email:</span> {companyInfo.email}</p>
                <p><span className="orders-muted">Phone:</span> {companyInfo.phone}</p>
                <p><span className="orders-muted">Address:</span> {companyInfo.address}</p>
              </div>
            </article>

            <article className="orders-card">
              <h2 className="orders-section-title">Customer Information</h2>
              <div className="orders-info-grid">
                <p><span className="orders-muted">Name:</span> {invoice.customerName}</p>
                <p><span className="orders-muted">Email:</span> {invoice.customer_email || '-'}</p>
                <p><span className="orders-muted">Phone:</span> {invoice.customer_phone || '-'}</p>
                <p><span className="orders-muted">Address:</span> {invoice.customer_address || '-'}</p>
              </div>
            </article>

            <article className="orders-card">
              <h2 className="orders-section-title">Itemized Products</h2>
              <div className="orders-table-wrap">
                <table className="orders-table">
                  <thead><tr><th>Product Name</th><th>Quantity</th><th>Price</th><th>Total</th></tr></thead>
                  <tbody>
                    {(invoice.items || []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.productName || '-'}</td>
                        <td>{item.quantity || 0}</td>
                        <td>{formatMoney(item.price || 0)}</td>
                        <td>{formatMoney((item.quantity || 0) * (item.price || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <aside className="orders-stack">
            <article className="orders-card">
              <h2 className="orders-section-title">Invoice Summary</h2>
              <div className="orders-price-grid">
                <div className="orders-row-between"><span className="orders-muted">Subtotal</span><span>{formatMoney(invoice.subtotal)}</span></div>
                <div className="orders-row-between"><span className="orders-muted">Shipping</span><span>{formatMoney(invoice.shipping || 0)}</span></div>
                <div className="orders-row-between"><span className="orders-muted">Taxes</span><span>{formatMoney(invoice.tax)}</span></div>
                <hr className="orders-divider" />
                <div className="orders-row-between orders-row-between--strong"><span>Total Amount</span><span>{formatMoney(invoice.total)}</span></div>
              </div>
            </article>
          </aside>
        </div>
      )}
    </section>
  );
}