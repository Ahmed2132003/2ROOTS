import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import InvoicesTable from '../../components/invoices/InvoicesTable';
import { useInvoices } from '../../hooks/useInvoices';
import { downloadInvoicePdf, printInvoice } from '../../components/invoices/invoicePrint';
import '../orders/orders.css';

export default function InvoicesListPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const { data: invoices = [], isLoading, isError, error, refetch } = useInvoices();

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
          <h1 className="orders-page__title">{tr('Invoices', 'الفواتير')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr('View, download, and print issued invoices.', 'عرض الفواتير الصادرة وتنزيلها وطباعتها.')}
          </p>
        </Motion.div>

        <Link to="/dashboard" className="orders-btn orders-btn--secondary">
          ← {tr('Dashboard', 'الداشبورد')}
        </Link>
      </header>

      {/* ── Error ── */}
      {isError && (
        <div className="orders-error" role="alert">
          <p>{error instanceof Error ? error.message : tr('Unable to load invoices.', 'تعذّر تحميل الفواتير.')}</p>
          <button type="button" onClick={() => refetch()} className="orders-btn">
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {!isError && (
        <Motion.div
          className="orders-surface"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <InvoicesTable
            invoices={invoices}
            loading={isLoading}
            onDownload={downloadInvoicePdf}
            onPrint={printInvoice}
          />
        </Motion.div>
      )}

    </section>
  );
}