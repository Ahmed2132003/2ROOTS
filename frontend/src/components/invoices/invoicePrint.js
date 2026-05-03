import { formatDate, formatMoney } from '../orders/orderUtils';
import companyInfo from '../../config/companyInfo';

function rows(items = []) {
  return items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.price || 0);
      const lineTotal = quantity * unitPrice;
      return `<tr><td>${item.productName || '-'}</td><td>${quantity}</td><td>${formatMoney(unitPrice)}</td><td>${formatMoney(lineTotal)}</td></tr>`;
    })
    .join('');
}

function invoiceHtml(invoice) {
  return `<!doctype html><html><head><title>Invoice ${invoice.invoiceId}</title><style>
  :root{color-scheme:light;} body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#111} .invoice{max-width:940px;margin:0 auto;padding:28px} .invoice-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px;border-bottom:1px solid #ddd;padding-bottom:12px} .logo{font-size:28px;font-weight:800;letter-spacing:-0.3px} .meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0} h1,h2,p{margin:0 0 8px} h2{font-size:16px} table{width:100%;border-collapse:collapse;margin-top:12px} th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top} th{background:#f7f7f7} .totals{max-width:320px;margin-left:auto;margin-top:16px} .totals div{display:flex;justify-content:space-between;margin:6px 0} .total-strong{font-weight:700;border-top:1px solid #ddd;padding-top:8px} @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.invoice{padding:8mm} .no-print{display:none !important;} }
  </style></head><body>
  <section class="invoice">
    <header class="invoice-head">
      <div><div class="logo">🦈 SHARK</div><p>${companyInfo.companyName}</p></div>
      <div><p><strong>Invoice:</strong> ${invoice.invoiceId}</p><p><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</p><p><strong>Status:</strong> ${invoice.status}</p></div>
    </header>
    <div class="meta"><div><h2>Company Info</h2><p>${companyInfo.companyName}</p><p>${companyInfo.email}</p><p>${companyInfo.phone}</p><p>${companyInfo.address}</p></div><div><h2>Customer Info</h2><p>${invoice.customerName || '-'}</p><p>${invoice.customer_email || '-'}</p><p>${invoice.customer_phone || '-'}</p><p>${invoice.customer_address || '-'}</p></div></div>
    <table><thead><tr><th>Product Name</th><th>Quantity</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows(invoice.items)}</tbody></table>
    <div class="totals"><div><span>Subtotal</span><span>${formatMoney(invoice.subtotal)}</span></div><div><span>Shipping</span><span>${formatMoney(invoice.shipping || 0)}</span></div><div><span>Taxes</span><span>${formatMoney(invoice.tax)}</span></div><div class="total-strong"><span>Total</span><span>${formatMoney(invoice.total)}</span></div></div>
  </section>
  </body></html>`;
}

export function printInvoice(invoice) {
  const win = window.open('', '_blank', 'width=1024,height=768');
  if (!win) return;
  win.document.write(invoiceHtml(invoice));
  win.document.close();
  win.focus();
  win.print();
}

export function downloadInvoicePdf(invoice) {
  const win = window.open('', '_blank', 'width=1024,height=768');
  if (!win) return;
  win.document.write(invoiceHtml(invoice));
  win.document.close();
  win.focus();
  win.print();
}