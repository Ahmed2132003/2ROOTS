import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import CustomerDetails from '../../components/customers/CustomerDetails';
import CustomerStats from '../../components/customers/CustomerStats';
import CustomerOrdersTable from '../../components/customers/CustomerOrdersTable';
import { useCustomer } from '../../hooks/useCustomers';
import '../orders/orders.css';

export default function CustomerDetailsPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const { id } = useParams();
  const { data, isLoading, isError, error, refetch } = useCustomer(id);

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
          <h1 className="orders-page__title">{tr('Customer Details', 'تفاصيل العميل')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr('Profile data, stats, and full order history.', 'بيانات الملف الشخصي والإحصائيات وسجل الطلبات.')}
          </p>
        </Motion.div>

        <Link to="/dashboard/customers" className="orders-btn orders-btn--secondary">
          ← {tr('Back to customers', 'العودة للعملاء')}
        </Link>
      </header>

      {/* ── Error ── */}
      {isError && (
        <div className="orders-error" role="alert">
          <p>
            {error instanceof Error
              ? error.message
              : tr('Unable to load customer details.', 'تعذّر تحميل تفاصيل العميل.')}
          </p>
          <button type="button" onClick={() => refetch()} className="orders-btn">
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {!isError && (
        <Motion.div
          className="orders-stack"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {/* Stats row */}
          <CustomerStats
            totalOrders={data?.totalOrders ?? 0}
            totalSpent={data?.totalSpent ?? 0}
            lastOrderDate={data?.lastOrderDate}
          />

          {/* Info + orders grid */}
          <div className="orders-details-grid">
            <CustomerDetails customer={data?.customer || {}} />

            <Motion.article
              className="orders-card orders-stack"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <header>
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
                  ✦ {tr('History', 'السجل')}
                </div>
                <h2 className="orders-section-title">
                  {tr('Order History', 'سجل الطلبات')}
                </h2>
              </header>
              <CustomerOrdersTable
                orders={data?.orders || []}
                loading={isLoading}
              />
            </Motion.article>
          </div>
        </Motion.div>
      )}

    </section>
  );
}