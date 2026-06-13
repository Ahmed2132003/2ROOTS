import { Link, useParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import './orders/orders.css';

/* ─── Status meta ───────────────────────────────────────────────── */
const STATUS_META = {
  pending:   { emoji: '🕒', en: 'Pending',   ar: 'قيد الانتظار', color: '#f59e0b' },
  confirmed: { emoji: '✅', en: 'Confirmed', ar: 'تم التأكيد',   color: '#10b981' },
  shipped:   { emoji: '🚚', en: 'Shipped',   ar: 'تم الشحن',    color: '#3b82f6' },
  delivered: { emoji: '📦', en: 'Delivered', ar: 'تم التوصيل',  color: '#8b5cf6' },
  cancelled: { emoji: '❌', en: 'Cancelled', ar: 'ملغي',        color: '#ef4444' },
};

/* ordered steps for the visual progress bar */
const STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];

function formatDate(value, isRTL) {
  if (!value) return '--';
  return new Date(value).toLocaleString(isRTL ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function TrackingSkeleton() {
  return (
    <div className="orders-skeleton">
      {[130, 88, 260].map((h, i) => (
        <Motion.div
          key={i}
          className="orders-skeleton-row"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

/* ─── Progress bar ──────────────────────────────────────────────── */
function StatusProgress({ currentStatus }) {
  const stepIdx = STEPS.indexOf(currentStatus);
  if (stepIdx === -1 || currentStatus === 'cancelled') return null;

  return (
    <div style={{ marginTop: '20px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`,
          gap: '6px',
          position: 'relative',
        }}
      >
        {/* connector line */}
        <div
          style={{
            position: 'absolute',
            top: '15px',
            left: '8%',
            right: '8%',
            height: '1px',
            background: 'var(--border)',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '15px',
            left: '8%',
            width: `${(stepIdx / (STEPS.length - 1)) * 84}%`,
            height: '1px',
            background: STATUS_META[currentStatus]?.color || 'var(--accent)',
            zIndex: 1,
            transition: 'width 0.6s ease',
          }}
        />

        {STEPS.map((step, i) => {
          const meta = STATUS_META[step];
          const done = i <= stepIdx;
          return (
            <div
              key={step}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '14px',
                  background: done ? `${meta.color}22` : 'var(--bg-primary)',
                  border: `1px solid ${done ? meta.color : 'var(--border)'}`,
                  transition: 'all 0.3s ease',
                }}
              >
                {meta.emoji}
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  fontWeight: done ? 700 : 400,
                  color: done ? 'var(--text-primary)' : 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                {meta.en}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function OrderTracking() {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const { data: order, error, isLoading, refetch } = useQuery({
    queryKey: ['order-tracking', id],
    queryFn: () => api.get(`/orders/track/${id}/`).then((res) => res.data),
    enabled: Boolean(id),
    retry: 1,
  });

  const currentStatus = STATUS_META[order?.status] || STATUS_META.pending;
  const history = [...(order?.history || [])].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

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
            ✦ {tr('Phase 4', 'المرحلة 4')}
          </div>
          <h1 className="orders-page__title">{tr('Order Tracking', 'تتبع الطلب')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr(`Track your order #${id} step by step.`, `تابع حالة طلبك رقم #${id} خطوة بخطوة.`)}
          </p>
        </Motion.div>
      </header>

      {/* ── Loading ── */}
      {isLoading && <TrackingSkeleton />}

      {/* ── Error ── */}
      {!isLoading && error && (
        <Motion.div
          className="orders-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '40px 24px' }}
        >
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔍</div>
          <h2
            className="orders-section-title"
            style={{ marginBottom: '8px', textAlign: 'center' }}
          >
            {tr('Order not found', 'لم يتم العثور على الطلب')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            {tr(
              'Please verify the order number and try again.',
              'تأكد من رقم الطلب وحاول مرة أخرى.'
            )}
          </p>
          <div
            style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}
          >
            <button className="orders-btn orders-btn--primary" onClick={() => refetch()}>
              {tr('Retry', 'إعادة المحاولة')}
            </button>
            <Link to="/" className="orders-btn orders-btn--secondary">
              {tr('Back to home', 'العودة للرئيسية')}
            </Link>
          </div>
        </Motion.div>
      )}

      {/* ── Content ── */}
      {!isLoading && !error && order && (
        <>
          {/* Summary cards */}
          <Motion.section
            className="orders-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              {[
                {
                  label: tr('Order ID', 'رقم الطلب'),
                  value: `#${order.id}`,
                  highlight: null,
                },
                {
                  label: tr('Current status', 'الحالة الحالية'),
                  value: `${currentStatus.emoji} ${isRTL ? currentStatus.ar : currentStatus.en}`,
                  highlight: currentStatus.color,
                },
                {
                  label: tr('Order total', 'إجمالي الطلب'),
                  value: `${Number(order.total).toLocaleString()} EGP`,
                  highlight: null,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    padding: '14px',
                    background: 'var(--bg-primary)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      marginBottom: '6px',
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      color: item.highlight || 'var(--text-primary)',
                      fontWeight: 800,
                      fontSize: '1rem',
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar (non-cancelled) */}
            {order.status !== 'cancelled' && (
              <StatusProgress currentStatus={order.status} />
            )}
          </Motion.section>

          {/* Timeline */}
          <Motion.section
            className="orders-card orders-stack"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
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
                {tr('Order status timeline', 'سجل حالة الطلب')}
              </h2>
            </header>

            {history.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                {tr(
                  'No updates yet. Every status change will appear here.',
                  'لا يوجد تحديثات بعد. سيتم عرض كل تغيير حالة هنا.'
                )}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {history.map((step, index) => {
                  const meta = STATUS_META[step.status] || STATUS_META.pending;
                  const isLast = index === history.length - 1;
                  return (
                    <Motion.div
                      key={`${step.changed_at}-${index}`}
                      initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                      style={{
                        border: `1px solid ${isLast ? meta.color + '55' : 'var(--border)'}`,
                        borderRadius: '2px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        background: isLast
                          ? `${meta.color}0d`
                          : 'var(--bg-primary)',
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: `${meta.color}22`,
                          color: meta.color,
                          fontSize: '16px',
                          flexShrink: 0,
                          border: `1px solid ${meta.color}44`,
                        }}
                      >
                        {meta.emoji}
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap',
                            marginBottom: '4px',
                          }}
                        >
                          <span
                            style={{
                              color: isLast ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: isLast ? 800 : 600,
                              fontSize: '0.9rem',
                              letterSpacing: isLast ? '0.5px' : 0,
                            }}
                          >
                            {isRTL ? meta.ar : meta.en}
                          </span>
                          {isLast && (
                            <span
                              className="status-badge"
                              style={{
                                background: `${meta.color}22`,
                                borderColor: `${meta.color}55`,
                                color: meta.color,
                              }}
                            >
                              {tr('Current', 'الحالي')}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            letterSpacing: '0.3px',
                          }}
                        >
                          {formatDate(step.changed_at, isRTL)}
                        </div>
                        {step.note && (
                          <div
                            style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.85rem',
                              marginTop: '6px',
                              paddingTop: '6px',
                              borderTop: '1px solid var(--border)',
                            }}
                          >
                            {step.note}
                          </div>
                        )}
                      </div>
                    </Motion.div>
                  );
                })}
              </div>
            )}
          </Motion.section>
        </>
      )}
    </section>
  );
}