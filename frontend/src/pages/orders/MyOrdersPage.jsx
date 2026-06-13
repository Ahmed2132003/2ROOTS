import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import { useMyOrders } from '../../hooks/useOrders';
import OrderCard from '../../components/orders/OrderCard';
import './orders.css';

export default function MyOrdersPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const { data: orders = [], isLoading, isError, error, refetch } = useMyOrders();

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
            ✦ {tr('Phase 7', 'المرحلة 7')}
          </div>
          <h1 className="orders-page__title">{tr('My Orders', 'طلباتي')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr(
              'Review your order history and track delivery updates.',
              'راجع سجل طلباتك وتابع تحديثات التوصيل.'
            )}
          </p>
        </Motion.div>
      </header>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="orders-skeleton" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Motion.div
              key={i}
              className="orders-skeleton-row"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
              style={{ height: '120px' }}
            />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="orders-error" role="alert">
          <p>
            {error instanceof Error
              ? error.message
              : tr(
                  'Unable to load your orders right now.',
                  'تعذّر تحميل طلباتك في الوقت الحالي.'
                )}
          </p>
          <button type="button" onClick={() => refetch()} className="orders-btn">
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !isError && orders.length === 0 && (
        <Motion.article
          className="orders-empty"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: '48px 24px' }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🛍️</div>
          <p style={{ marginBottom: '4px', color: 'var(--text-primary)', fontWeight: 700 }}>
            {tr('No orders yet', 'لا توجد طلبات بعد')}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            {tr(
              'Your order history will appear here once you make a purchase.',
              'سيظهر سجل طلباتك هنا بمجرد إتمام أول عملية شراء.'
            )}
          </p>
          <Link
            to="/products"
            className="orders-btn orders-btn--primary"
            style={{ display: 'inline-flex' }}
          >
            {tr('Start Shopping', 'ابدأ التسوق')}
          </Link>
        </Motion.article>
      )}

      {/* ── Orders list ── */}
      {!isLoading && !isError && orders.length > 0 && (
        <Motion.div
          style={{ display: 'grid', gap: '14px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          {/* summary bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {orders.length} {tr('order(s)', orders.length === 1 ? 'طلب' : 'طلبات')}
            </span>
            <Link
              to="/products"
              className="orders-btn orders-btn--secondary orders-btn--table"
            >
              {tr('Continue Shopping', 'مواصلة التسوق')}
            </Link>
          </div>

          {orders.map((order, i) => (
            <Motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <OrderCard order={order} />
            </Motion.div>
          ))}
        </Motion.div>
      )}

    </section>
  );
}