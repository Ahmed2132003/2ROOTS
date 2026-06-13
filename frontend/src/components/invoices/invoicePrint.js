import { formatDate, formatMoney } from '../orders/orderUtils';
import companyInfo from '../../config/companyInfo';

function rows(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return '<tr><td colspan="4" style="text-align:center;color:#555">No product lines available for this invoice.</td></tr>';
  }

  return items
    .map((item) => {
      const quantity  = Number(item.quantity || 0);
      const unitPrice = Number(item.price || item.unit_price || 0);
      const lineTotal = Number(item.total || item.subtotal || 0);
      const sizeLine  = item.size  ? `<span class="variant-badge">📐 Size: ${item.size}</span>`   : '';
      const colorLine = item.color ? `<span class="variant-badge">🎨 Color: ${item.color}</span>` : '';
      return `<tr>
        <td>
          <div>${item.productName || '-'}</div>
          <div class="variant-meta">${sizeLine}${colorLine}</div>
        </td>
        <td>${quantity}</td>
        <td>${formatMoney(unitPrice)}</td>
        <td>${formatMoney(lineTotal)}</td>
      </tr>`;
    })
    .join('');
}

/* ─────────────────────────────────────────────────────────────
   Build the logo HTML:
   • Try <img src="/2roots.png"> first (works in browser print)
   • onerror falls back to styled text "2ROOTS"
───────────────────────────────────────────────────────────── */
const LOGO_HTML = `
  <img
    src="/2roots.png"
    alt="2ROOTS"
    style="height:48px;width:auto;object-fit:contain;display:block;"
    onerror="this.style.display='none';document.getElementById('logo-fallback').style.display='block';"
  />
  <span
    id="logo-fallback"
    style="display:none;font-size:26px;font-weight:900;letter-spacing:1px;color:#111;font-family:Arial Black,Arial,sans-serif;"
  >2ROOTS</span>
`;

function invoiceHtml(invoice) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoiceId}</title>
  <style>
    :root { color-scheme: light; }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, sans-serif;
      background: #fff;
      color: #111;
      font-size: 14px;
      line-height: 1.5;
    }

    .invoice {
      max-width: 860px;
      margin: 0 auto;
      padding: 32px 28px;
    }

    /* ── Header ── */
    .invoice-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 20px;
      margin-bottom: 24px;
      border-bottom: 2px solid #111;
    }

    .invoice-head__left {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .invoice-head__right {
      text-align: right;
    }

    .invoice-head__right p {
      margin-bottom: 4px;
      font-size: 13px;
      color: #333;
    }

    .invoice-id {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #111;
      margin-bottom: 2px;
    }

    .status-pill {
      display: inline-block;
      padding: 3px 12px;
      border: 1px solid #111;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #111;
      margin-top: 6px;
    }

    /* ── Party info ── */
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }

    .meta-block h2 {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }

    .meta-block p {
      font-size: 13px;
      color: #333;
      margin-bottom: 4px;
    }

    /* ── Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    th {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #888;
      padding: 10px 12px;
      border-bottom: 2px solid #111;
      text-align: left;
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
      font-size: 13px;
      color: #333;
    }

    td:first-child { color: #111; font-weight: 600; }
    td:last-child  { font-weight: 700; color: #111; }

    .variant-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 5px;
    }

    .variant-badge {
      display: inline-flex;
      border: 1px solid #ddd;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      color: #666;
      font-weight: 400;
    }

    /* ── Totals ── */
    .totals {
      max-width: 300px;
      margin-left: auto;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #555;
      border-bottom: 1px solid #f0f0f0;
    }

    .totals-row--strong {
      font-size: 16px;
      font-weight: 800;
      color: #111;
      padding-top: 12px;
      border-top: 2px solid #111;
      border-bottom: none;
    }

    /* ── Footer ── */
    .invoice-footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 11px;
      color: #aaa;
      text-align: center;
    }

    /* ── Print ── */
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .invoice { padding: 8mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <section class="invoice">

    <!-- Header -->
    <header class="invoice-head">
      <div class="invoice-head__left">
        ${LOGO_HTML}
        <p style="font-size:12px;color:#888;margin-top:8px;">${companyInfo.companyName}</p>
        <p style="font-size:11px;color:#aaa;">${companyInfo.email}</p>
        <p style="font-size:11px;color:#aaa;">${companyInfo.phone}</p>
      </div>
      <div class="invoice-head__right">
        <p class="invoice-id">${invoice.invoiceId}</p>
        <p><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</p>
        ${invoice.orderId ? `<p><strong>Order:</strong> #${invoice.orderId}</p>` : ''}
        <span class="status-pill">${invoice.status || 'draft'}</span>
      </div>
    </header>

    <!-- Party Info -->
    <div class="meta">
      <div class="meta-block">
        <h2>From</h2>
        <p><strong>${companyInfo.companyName}</strong></p>
        <p>${companyInfo.email}</p>
        <p>${companyInfo.phone}</p>
        <p>${companyInfo.address}</p>
      </div>
      <div class="meta-block">
        <h2>Bill To</h2>
        <p><strong>${invoice.customerName || '-'}</strong></p>
        <p>${invoice.customerEmail || invoice.customer_email || '-'}</p>
        <p>${invoice.customerPhone || invoice.customer_phone || '-'}</p>
        <p>${invoice.customerAddress || invoice.customer_address || '-'}</p>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows(invoice.items)}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatMoney(invoice.subtotal)}</span>
      </div>
      <div class="totals-row">
        <span>Discount</span>
        <span>− ${formatMoney(invoice.discount || 0)}</span>
      </div>
      <div class="totals-row">
        <span>Shipping</span>
        <span>${formatMoney(invoice.shipping || 0)}</span>
      </div>
      <div class="totals-row">
        <span>Taxes</span>
        <span>${formatMoney(invoice.tax)}</span>
      </div>
      <div class="totals-row totals-row--strong">
        <span>Total</span>
        <span>${formatMoney(invoice.total)}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="invoice-footer">
      Thank you for your business — 2ROOTS © ${new Date().getFullYear()}
    </div>

  </section>
</body>
</html>`;
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