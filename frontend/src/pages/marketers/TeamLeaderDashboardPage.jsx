import { useState, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyMarketerProfile,
  getMyTeamMembers,
  getMyTeamSalesSummary,
  getMyRewards,
  getAvailableForTeam,
  addMembersToTeam,
  getMyMarketerOrders,
  getMyProductPrices,
  createMarketerOrder,
  getMyWithdrawals,
  createWithdrawal,
} from '../../services/marketerService';
import api from '../../services/api';

/* ─────────────────────────────────────────────────────────────── */
/*  Design system note:                                            */
/*  This page now uses the SAME shared classes as the rest of the  */
/*  admin/marketer area (orders.css / index.css / dashboard.css):  */
/*  orders-btn / orders-input / orders-select / orders-table /     */
/*  orders-surface / stats-card / badge-* / orders-feedback /      */
/*  dashboard-error / product-modal*. No more one-off inline       */
/*  colors — everything ties back to the brand's dark/gold/stone   */
/*  tokens defined in :root so the UI stays consistent app-wide.   */
/* ─────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────── */
/*  Shared helpers                                                 */
/* ─────────────────────────────────────────────────────────────── */

function Eyebrow({ children }) {
  return (
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
      ✦ {children}
    </div>
  );
}

function SectionCard({ children, style }) {
  return (
    <div
      className="orders-surface"
      style={{ marginBottom: '24px', overflow: 'hidden', ...style }}
    >
      {children}
    </div>
  );
}

/* Status pill — now reuses the global .badge system (index.css)
   so colours match every other status pill in the app. */
function StatusBadge({ status }) {
  const variant = {
    pending: 'badge-warning',
    approved: 'badge-info',
    paid: 'badge-success',
    rejected: 'badge-danger',
    confirmed: 'badge-success',
    active: 'badge-success',
    suspended: 'badge-danger',
  }[status] || 'badge-neutral';

  return <span className={`badge ${variant}`}>{status}</span>;
}

/* Skeleton rows — reuses the shimmer skeleton already used across
   the orders pages instead of a one-off framer-motion pulse. */
function SkeletonRows({ count = 3, height = 56 }) {
  return (
    <div className="orders-skeleton" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="orders-skeleton-row" style={{ height }} />
      ))}
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div className="dashboard-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="orders-btn orders-btn--secondary orders-btn--table">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

/* FormError / FormSuccess — reuse the .orders-feedback classes
   already defined for the orders pages. */

function FormError({ message }) {
  if (!message) return null;
  return (
    <Motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="orders-feedback orders-feedback--error"
      style={{ marginBottom: '14px' }}
    >
      {message}
    </Motion.div>
  );
}

function FormSuccess({ message }) {
  if (!message) return null;
  return (
    <Motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className="orders-feedback orders-feedback--success"
      style={{ marginBottom: '14px' }}
    >
      {message}
    </Motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Stats Row                                                       */
/* ─────────────────────────────────────────────────────────────── */

function ProfileStatsRow({ profile }) {
  const cards = [
    {
      label: 'أوردراتي هذا الشهر',
      value: profile.monthly_completed_orders_count ?? 0,
      sub: 'دورتك الشهرية الحالية',
      accent: false,
    },
    {
      label: 'إجمالي أوردراتي',
      value: profile.lifetime_total_orders ?? 0,
      sub: 'منذ الانضمام — للمعلومة فقط',
      accent: false,
    },
    {
      label: 'الرصيد القابل للسحب الآن',
      value: `${Number(profile.monthly_profit_balance ?? 0).toFixed(2)} ج.م`,
      sub: 'رصيد الدورة الحالية فقط',
      accent: true,
    },
    {
      label: 'إجمالي أرباحي منذ الانضمام',
      value: `${Number(profile.lifetime_total_profit ?? 0).toFixed(2)} ج.م`,
      sub: 'تراكمي — للمعلومة فقط',
      accent: false,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '28px',
      }}
    >
      {cards.map((c, i) => (
        <Motion.article
          key={c.label}
          className="stats-card"
          aria-label={c.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 + i * 0.06 }}
          style={
            c.accent
              ? {
                  border: '1.5px solid var(--accent)',
                  background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                }
              : {}
          }
        >
          <div className="stats-card__header">
            <p className="stats-card__title">{c.label}</p>
          </div>
          <h3
            className="stats-card__value"
            style={c.accent ? { color: 'var(--accent)' } : {}}
          >
            {c.value}
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {c.sub}
          </p>
        </Motion.article>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Add Member Modal                                               */
/* ─────────────────────────────────────────────────────────────── */

function AddMemberModal({ onClose, onSuccess }) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitError, setSubmitError] = useState(null);

  /* ── FIX ─────────────────────────────────────────────────────
     الـ endpoint /api/marketers/available-for-team/ بيرجع response
     متـ paginated من الـ DRF (شكل {count, next, previous, results:[...]})
     مش array مباشر. كان الكود قبل كده بياخد data كأنها array على طول
     (data: available = []) وده كان بيكسر available.filter() بمجرد
     ما اليوزر يفتح المودال — نفس الـ pattern المستخدم في باقي
     الكومبوننتس في الملف ده (Array.isArray(data) ? data : data?.results ?? [])
     اتطبق هنا كمان عشان يدعم الشكلين بأمان.
     ──────────────────────────────────────────────────────────── */
  const { data: availableRaw, isLoading } = useQuery({
    queryKey: ['available-for-team'],
    queryFn: getAvailableForTeam,
  });

  const available = Array.isArray(availableRaw)
    ? availableRaw
    : (availableRaw?.results ?? []);

  const mutation = useMutation({
    mutationFn: () => addMembersToTeam(selectedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-team-members'] });
      setSubmitError(null);
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object' && data !== null) {
        const msgs = Object.values(data).flat().join(' | ');
        setSubmitError(msgs || 'حدث خطأ غير متوقع.');
      } else {
        setSubmitError(err?.message || 'حدث خطأ غير متوقع.');
      }
    },
  });

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filtered = available.filter(
    (m) =>
      m.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="product-modal__backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="product-modal"
        style={{ width: 'min(480px, 100%)' }}
      >
        <div className="product-modal__header">
          <div>
            <Eyebrow>إضافة عضو</Eyebrow>
            <h3>إضافة مسوقين للفريق</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="product-modal__close"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <div className="product-modal__form">
          <FormError message={submitError} />

          <input
            type="text"
            placeholder="بحث باسم المسوق أو كوده…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="orders-input"
          />

          {isLoading && <SkeletonRows count={4} height={44} />}

          {!isLoading && filtered.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {searchTerm ? 'لا توجد نتائج لهذا البحث.' : 'لا يوجد مسوقين متاحين للانضمام حاليًا.'}
            </p>
          )}

          {!isLoading && filtered.length > 0 && (
            <div
              style={{
                maxHeight: '280px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '2px',
              }}
            >
              {filtered.map((m) => {
                const isSelected = selectedIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleSelect(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                        : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '3px',
                        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border-strong)'}`,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && (
                        <span style={{ color: 'var(--black)', fontSize: '11px', lineHeight: 1 }}>✓</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.user_name || m.referral_code}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        كود: {m.referral_code}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="product-modal__footer">
          <button type="button" onClick={onClose} className="ghost">
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || selectedIds.length === 0}
            className="orders-btn orders-btn--primary"
          >
            {mutation.isPending
              ? 'جارٍ الإضافة…'
              : `إضافة ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''} للفريق`}
          </button>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Team Management Section                                        */
/* ─────────────────────────────────────────────────────────────── */

function TeamManagementSection() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['my-team-members'],
    queryFn: getMyTeamMembers,
    refetchInterval: 60_000, // auto-refresh every 60s — simple polling, no websockets needed
  });

  const members = Array.isArray(data) ? data : (data?.results ?? []);

  const handleRefresh = useCallback(() => {
    refetch();
    setLastRefresh(new Date());
  }, [refetch]);

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <Eyebrow>الفريق</Eyebrow>
          <h2 className="orders-section-title">أفراد الفريق ({members.length})</h2>
        </div>
        <div className="orders-actions">
          {lastRefresh && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              آخر تحديث: {lastRefresh.toLocaleTimeString('ar-EG')}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            className="orders-btn orders-btn--secondary orders-btn--table"
            title="تحديث البيانات"
          >
            {isFetching ? '⟳ جارٍ…' : '⟳ تحديث'}
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="orders-btn orders-btn--primary"
          >
            + إضافة مسوق للفريق
          </button>
        </div>
      </div>

      <p className="orders-muted" style={{ margin: '0 0 16px', fontSize: '0.82rem' }}>
        الجدول يتحدث تلقائيًا كل دقيقة — أو اضغط &quot;تحديث&quot; لرؤية أحدث النشاط فورًا.
      </p>

      {isLoading && <SkeletonRows count={5} height={52} />}
      {isError && (
        <ErrorBox message="تعذّر تحميل بيانات الفريق." onRetry={handleRefresh} />
      )}

      {!isLoading && !isError && members.length === 0 && (
        <div className="orders-empty">
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>👥</div>
          <p style={{ margin: 0 }}>لا يوجد أعضاء في فريقك بعد.</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="orders-btn orders-btn--primary"
            style={{ marginTop: '14px' }}
          >
            + إضافة أول عضو
          </button>
        </div>
      )}

      {!isLoading && !isError && members.length > 0 && (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                {['المسوق', 'البريد الإلكتروني', 'أوردرات هذا الشهر', 'آخر أوردر', 'الحالة'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <Motion.tr
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.full_name || '—'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      كود: {m.referral_code || '—'}
                    </div>
                  </td>
                  <td className="orders-muted" style={{ whiteSpace: 'nowrap' }}>
                    {m.email || '—'}
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: m.monthly_completed_orders_count > 0 ? 'var(--success)' : 'var(--text-secondary)',
                      }}
                    >
                      {m.monthly_completed_orders_count ?? 0} أوردر
                    </span>
                    {m.has_orders_this_month === false && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--warning)', marginTop: '2px' }}>
                        لم يسجّل أوردرات بعد
                      </div>
                    )}
                  </td>
                  <td className="orders-muted" style={{ whiteSpace: 'nowrap' }}>
                    {m.last_order_at
                      ? new Date(m.last_order_at).toLocaleDateString('ar-EG')
                      : '—'}
                  </td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                </Motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <AddMemberModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => refetch()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Team Sales Summary Section                                     */
/* ─────────────────────────────────────────────────────────────── */

function TeamSalesSummarySection() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-team-sales-summary'],
    queryFn: getMyTeamSalesSummary,
  });

  if (isLoading) return <div style={{ padding: '20px' }}><SkeletonRows count={4} height={60} /></div>;
  if (isError) return <div style={{ padding: '20px' }}><ErrorBox message="تعذّر تحميل مبيعات الفريق." onRetry={refetch} /></div>;
  if (!data) return null;

  const { total_orders, total_profit, tiers = [], next_tier } = data;

  // progress towards next tier
  const progressPct = next_tier
    ? Math.min(100, Math.round((total_orders / next_tier.min_team_sales) * 100))
    : 100;

  return (
    <div style={{ padding: '20px' }}>
      <Eyebrow>مبيعات الفريق</Eyebrow>
      <h2 className="orders-section-title">مبيعات الفريق هذا الشهر</h2>
      <p className="orders-muted" style={{ margin: '4px 0 20px', fontSize: '0.82rem' }}>
        مبيعاتك الشخصية غير محسوبة هنا — هذا الرقم يعكس مبيعات أعضاء فريقك فقط.
      </p>

      {/* Summary numbers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <Motion.article
          className="stats-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="stats-card__header">
            <p className="stats-card__title">أوردرات الفريق</p>
          </div>
          <h3 className="stats-card__value">{total_orders ?? 0}</h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            الدورة الشهرية الحالية
          </p>
        </Motion.article>

        <Motion.article
          className="stats-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          style={{
            border: '1.5px solid var(--accent)',
            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
          }}
        >
          <div className="stats-card__header">
            <p className="stats-card__title">أرباح الفريق</p>
          </div>
          <h3 className="stats-card__value" style={{ color: 'var(--accent)' }}>
            {Number(total_profit ?? 0).toFixed(2)} ج.م
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            إجمالي ربح أعضاء الفريق
          </p>
        </Motion.article>
      </div>

      {/* Progress bar towards next tier */}
      {next_tier ? (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '0.82rem',
            }}
          >
            <span className="orders-muted">التقدم نحو المكافأة التالية</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {total_orders} / {next_tier.min_team_sales} أوردر
            </span>
          </div>
          <div
            style={{
              height: '10px',
              borderRadius: '999px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{
                height: '100%',
                borderRadius: '999px',
                background: 'var(--accent)',
              }}
            />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--warning)' }}>
            🎯 {next_tier.min_team_sales - total_orders} أوردر إضافي للحصول على مكافأة{' '}
            <strong>{Number(next_tier.reward_amount).toFixed(2)} ج.م</strong>
          </p>
        </div>
      ) : (
        <div
          className="orders-feedback orders-feedback--success"
          style={{ marginBottom: '24px' }}
        >
          ✓ حققت أعلى درجة مكافأة هذا الشهر!
        </div>
      )}

      {/* All tiers */}
      {tiers.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            جدول درجات المكافآت
          </h3>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            {tiers.map((tier, i) => {
              const achieved = total_orders >= tier.min_team_sales;
              const isNext =
                !achieved &&
                next_tier &&
                tier.min_team_sales === next_tier.min_team_sales;
              return (
                <div
                  key={tier.id ?? i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: i < tiers.length - 1 ? '1px solid var(--border)' : 'none',
                    background: achieved
                      ? 'color-mix(in srgb, var(--success) 8%, transparent)'
                      : isNext
                      ? 'color-mix(in srgb, var(--warning) 8%, transparent)'
                      : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>
                      {achieved ? '✅' : isNext ? '🎯' : '○'}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tier.min_team_sales}+{' '}
                        {tier.max_team_sales ? `— ${tier.max_team_sales}` : ''} أوردر
                      </div>
                      {isNext && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--warning)', marginTop: '1px' }}>
                          المستهدف التالي
                        </div>
                      )}
                      {achieved && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: '1px' }}>
                          محقق ✓
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: achieved ? 'var(--success)' : isNext ? 'var(--warning)' : 'var(--text-secondary)',
                    }}
                  >
                    {Number(tier.reward_amount).toFixed(2)} ج.م
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  My Rewards Section                                             */
/* ─────────────────────────────────────────────────────────────── */

function MyRewardsSection() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-rewards'],
    queryFn: getMyRewards,
  });

  const rewards = Array.isArray(data) ? data : (data?.results ?? []);

  const rewardStatusLabel = {
    pending: 'قيد المراجعة',
    approved: 'معتمدة',
    paid: 'مدفوعة',
  };

  if (isLoading) return <div style={{ padding: '20px' }}><SkeletonRows count={4} height={52} /></div>;
  if (isError) return <div style={{ padding: '20px' }}><ErrorBox message="تعذّر تحميل سجل المكافآت." onRetry={refetch} /></div>;

  return (
    <div style={{ padding: '20px' }}>
      <Eyebrow>المكافآت</Eyebrow>
      <h2 className="orders-section-title">سجل مكافآتي كقائد</h2>
      <p className="orders-muted" style={{ margin: '4px 0 16px', fontSize: '0.82rem' }}>
        المكافآت بتتحسب على مبيعات فريقك وبتتراجعها الإدارة للاعتماد.
      </p>

      {rewards.length === 0 && (
        <div className="orders-empty">
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏅</div>
          <p style={{ margin: 0 }}>لا توجد مكافآت بعد — ابدأ بتحقيق أهداف مبيعات فريقك!</p>
        </div>
      )}

      {rewards.length > 0 && (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                {['الدورة', 'مبيعات الفريق وقتها', 'قيمة المكافأة', 'الحالة', 'التاريخ'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rewards.map((r, i) => (
                <Motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td className="orders-muted">#{r.cycle_number}</td>
                  <td style={{ fontWeight: 600 }}>{r.team_sales_count_at_award} أوردر</td>
                  <td
                    style={{
                      fontWeight: 700,
                      color: r.status === 'paid' ? 'var(--success)' : 'var(--text-primary)',
                    }}
                  >
                    {Number(r.reward_amount).toFixed(2)} ج.م
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {rewardStatusLabel[r.status] ?? r.status}
                    </div>
                  </td>
                  <td className="orders-muted" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString('ar-EG')}
                  </td>
                </Motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Personal Orders Section (reused from A9 pattern)              */
/* ─────────────────────────────────────────────────────────────── */

function PersonalOrdersSection() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-marketer-orders', statusFilter],
    queryFn: () => getMyMarketerOrders(statusFilter),
  });

  const orders = Array.isArray(data) ? data : (data?.results ?? []);

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <Eyebrow>أوردراتي الشخصية</Eyebrow>
          <h2 className="orders-section-title">الأوردرات اللي سجّلتها بنفسك</h2>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="orders-select orders-select--table"
        >
          <option value="">كل الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="confirmed">مؤكَّد</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      {isLoading && <SkeletonRows count={4} height={52} />}
      {isError && <ErrorBox message="تعذّر تحميل الأوردرات." onRetry={refetch} />}

      {!isLoading && !isError && orders.length === 0 && (
        <p className="orders-muted" style={{ fontSize: '0.88rem', padding: '16px 0' }}>
          لا توجد أوردرات{statusFilter ? ` بحالة "${statusFilter}"` : ''} حتى الآن.
        </p>
      )}

      {!isLoading && !isError && orders.length > 0 && (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                {['المنتج', 'الكمية', 'سعر البيع', 'الربح', 'العميل', 'الحالة', 'التاريخ'].map(
                  (h) => <th key={h}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <Motion.tr
                  key={o.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td>{o.product_name ?? `#${o.product}`}</td>
                  <td>{o.quantity}</td>
                  <td>{Number(o.sale_price_per_unit).toFixed(2)} ج.م</td>
                  <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                    {Number(o.profit_amount).toFixed(2)} ج.م
                  </td>
                  <td>
                    <div>{o.customer_name}</div>
                    {o.customer_phone && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {o.customer_phone}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="orders-muted" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(o.created_at).toLocaleDateString('ar-EG')}
                  </td>
                </Motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  New Personal Order Form — نسخة مطابقة 100% لفورم "أوردر جديد"  */
/*  بتاع MarketerDashboardPage.jsx (NewOrderForm): سلة أصناف متعددة، */
/*  اختيار لون/مقاس (variant)، محافظة وعنوان شحن، ونفس منطق الحفظ.  */
/*  ملحوظة: هذا الأوردر لن يُحسب ضمن مبيعات الفريق — نفس التنويه    */
/*  الأصلي اللي كان موجود في نسخة التيم ليدر القديمة.               */
/* ─────────────────────────────────────────────────────────────── */

const EMPTY_LINE_DRAFT = {
  product_id: '',
  variant_id: '',
  quantity: 1,
  sale_price_per_unit: '',
};

const EMPTY_CUSTOMER = {
  customer_name: '',
  customer_phone: '',
  shipping_address: '',
  shipping_region_id: '',
};

function NewPersonalOrderForm({ onSuccess }) {
  const qc = useQueryClient();

  /* ── Product prices assigned to this marketer ── */
  const { data: pricesData, isLoading: pricesLoading } = useQuery({
    queryKey: ['my-product-prices'],
    queryFn: getMyProductPrices,
  });
  const prices = Array.isArray(pricesData) ? pricesData : (pricesData?.results ?? []);

  /* ── Shared customer/shipping fields (مرة واحدة لكل الأوردر) ── */
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);

  /* ── الأصناف المضافة للسلة (cart-like) ── */
  const [lines, setLines] = useState([]);

  /* ── مسودة الصنف الحالي اللي بيتجهز قبل الإضافة للسلة ── */
  const [draft, setDraft] = useState(EMPTY_LINE_DRAFT);
  const [formError, setFormError] = useState(null);

  /* ── Fetch variants when draft product changes ── */
  const { data: variantsData, isLoading: variantsLoading } = useQuery({
    queryKey: ['product-variants', draft.product_id],
    queryFn: () =>
      api.get(`/products/${draft.product_id}/variants/`).then((r) => r.data),
    enabled: !!draft.product_id,
  });
  const variants = Array.isArray(variantsData)
    ? variantsData
    : (variantsData?.results ?? []);

  /* ── Fetch shipping regions (محافظات الشحن) ── */
  const { data: shippingRegionsData, isLoading: shippingRegionsLoading } = useQuery({
    queryKey: ['shipping-regions'],
    queryFn: () => api.get('/orders/shipping-regions/').then((r) => r.data),
  });
  const shippingRegions = Array.isArray(shippingRegionsData)
    ? shippingRegionsData
    : (shippingRegionsData?.results ?? []);
  const selectedShippingRegion = shippingRegions.find(
    (r) => String(r.id) === String(customer.shipping_region_id)
  );

  /* available = variants that have stock > 0 */
  const availableVariants = variants.filter(
    (v) => v.is_active && (v.stock?.quantity ?? 0) > 0
  );

  /* ── Reset variant when draft product changes ── */
  const handleProductChange = (e) => {
    setDraft((p) => ({ ...p, product_id: e.target.value, variant_id: '' }));
  };

  const setDraftField = (field) => (e) =>
    setDraft((p) => ({ ...p, [field]: e.target.value }));

  const setCustomerField = (field) => (e) =>
    setCustomer((p) => ({ ...p, [field]: e.target.value }));

  /* ── Derived (draft) ── */
  const selectedPrice = prices.find(
    (p) => String(p.product) === String(draft.product_id)
  );
  const selectedVariant = availableVariants.find(
    (v) => String(v.id) === String(draft.variant_id)
  );
  const draftProfit =
    selectedPrice && draft.sale_price_per_unit && draft.quantity
      ? (
          (Number(draft.sale_price_per_unit) -
            Number(selectedPrice.assigned_price)) *
          Number(draft.quantity)
        ).toFixed(2)
      : null;

  /* ── إضافة المسودة الحالية كصنف في السلة ── */
  const handleAddLine = () => {
    setFormError(null);
    if (!draft.product_id) return setFormError('اختر منتجًا أولاً.');
    if (availableVariants.length > 0 && !draft.variant_id)
      return setFormError('اختر اللون والمقاس المطلوب.');
    if (!draft.sale_price_per_unit || Number(draft.sale_price_per_unit) <= 0)
      return setFormError('سعر البيع لازم يكون أكبر من صفر.');
    if (!draft.quantity || Number(draft.quantity) < 1)
      return setFormError('الكمية لازم تكون 1 على الأقل.');
    if (selectedVariant && Number(draft.quantity) > (selectedVariant.stock?.quantity ?? 0))
      return setFormError(
        `الكمية المطلوبة أكبر من المخزون المتاح (${selectedVariant.stock?.quantity ?? 0} قطعة).`
      );

    const productName = selectedPrice?.product_name || `منتج #${draft.product_id}`;
    const variantLabel = selectedVariant
      ? [selectedVariant.color?.name, selectedVariant.size?.name].filter(Boolean).join(' / ') || selectedVariant.name
      : null;

    setLines((prev) => [
      ...prev,
      {
        key: `${draft.product_id}-${draft.variant_id || 'novariant'}-${Date.now()}`,
        product_id: Number(draft.product_id),
        product_name: productName,
        variant_id: draft.variant_id ? Number(draft.variant_id) : null,
        variant_label: variantLabel,
        quantity: Number(draft.quantity),
        sale_price_per_unit: Number(draft.sale_price_per_unit),
        assigned_price: selectedPrice ? Number(selectedPrice.assigned_price) : null,
        max_stock: selectedVariant?.stock?.quantity ?? null,
      },
    ]);

    /* تصفير المسودة بعد الإضافة عشان يضيف صنف جديد */
    setDraft(EMPTY_LINE_DRAFT);
  };

  /* ── حذف صنف من السلة ── */
  const handleRemoveLine = (key) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  /* ── إجماليات السلة ── */
  const linesTotal = lines.reduce(
    (sum, l) => sum + l.sale_price_per_unit * l.quantity,
    0
  );
  const linesProfit = lines.reduce(
    (sum, l) =>
      sum + (l.assigned_price != null ? (l.sale_price_per_unit - l.assigned_price) * l.quantity : 0),
    0
  );

  /* ── Submit الأوردر كامل (كل الأصناف + بيانات العميل) ── */
  const mutation = useMutation({
    mutationFn: createMarketerOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-marketer-orders'] });
      qc.invalidateQueries({ queryKey: ['my-marketer-profile'] });
      setLines([]);
      setDraft(EMPTY_LINE_DRAFT);
      setCustomer(EMPTY_CUSTOMER);
      setFormError(null);
      onSuccess?.();
    },
    onError: (err) => {
      const data = err?.response?.data;
      setFormError(
        typeof data === 'object' && data !== null
          ? Object.values(data).flat().join(' | ')
          : err?.message || 'حدث خطأ غير متوقع.'
      );
    },
  });

  const handleSubmitOrder = () => {
    setFormError(null);
    if (lines.length === 0) return setFormError('أضف صنفًا واحدًا على الأقل قبل تأكيد الأوردر.');
    if (!customer.customer_name.trim()) return setFormError('اسم العميل مطلوب.');
    if (!customer.shipping_region_id) return setFormError('اختر محافظة الشحن.');
    if (!customer.shipping_address.trim()) return setFormError('عنوان الشحن بالتفصيل مطلوب.');

    mutation.mutate({
      items: lines.map((l) => ({
        product_id: l.product_id,
        ...(l.variant_id ? { variant_id: l.variant_id } : {}),
        quantity: l.quantity,
        sale_price_per_unit: l.sale_price_per_unit,
      })),
      customer_name: customer.customer_name.trim(),
      customer_phone: customer.customer_phone.trim(),
      shipping_region_id: Number(customer.shipping_region_id),
      shipping_address: customer.shipping_address.trim(),
    });
  };

  const label = (text, required = false) => (
    <label
      style={{
        display: 'block',
        fontSize: '0.8rem',
        fontWeight: 700,
        marginBottom: '7px',
        color: 'var(--text-secondary)',
      }}
    >
      {text}{required && <span style={{ color: 'var(--danger)', marginRight: '3px' }}>*</span>}
    </label>
  );

  /* ── Section divider ── */
  const SectionTitle = ({ children }) => (
    <div
      style={{
        gridColumn: '1 / -1',
        paddingTop: '8px',
        marginTop: '4px',
        borderTop: '1px solid var(--border)',
        fontSize: '0.78rem',
        fontWeight: 800,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: '4px',
      }}
    >
      {children}
    </div>
  );

  return (
    <div style={{ padding: '20px' }}>
      <Eyebrow>تسجيل أوردر</Eyebrow>
      <h2 style={{ margin: '4px 0 4px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
        تسجيل أوردر شخصي جديد
      </h2>
      <p className="orders-muted" style={{ margin: '0 0 20px', fontSize: '0.85rem' }}>
        ملحوظة: هذا الأوردر لن يُحسب ضمن مبيعات فريقك — بيروح لصالح القائد السابق حسب قاعدة النظام.
        ضيف منتج أو أكتر للسلة (نفس المنتج بألوان/مقاسات مختلفة أو منتجات مختلفة)، وبعدين أدخل بيانات العميل وأكّد الأوردر. سيظهر بحالة "قيد المراجعة" حتى يؤكده الأدمن.
      </p>

      <FormError message={formError} />

      {/* ── سلة الأصناف المضافة ── */}
      {lines.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: '10px',
            }}
          >
            أصناف الأوردر ({lines.length})
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <AnimatePresence initial={false}>
              {lines.map((l, i) => (
                <Motion.div
                  key={l.key}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: i < lines.length - 1 ? '1px solid var(--border)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-primary)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {l.product_name}
                      {l.variant_label && (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}> — {l.variant_label}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      الكمية: {l.quantity} × {l.sale_price_per_unit.toFixed(2)} ج.م = {(l.quantity * l.sale_price_per_unit).toFixed(2)} ج.م
                      {l.assigned_price != null && (
                        <span style={{ color: 'var(--success)', marginRight: '8px' }}>
                          ربح: {((l.sale_price_per_unit - l.assigned_price) * l.quantity).toFixed(2)} ج.م
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(l.key)}
                    className="orders-btn orders-btn--danger orders-btn--table"
                  >
                    حذف
                  </button>
                </Motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', marginTop: '10px', fontSize: '0.85rem' }}>
            <span className="orders-muted">
              الإجمالي: <strong style={{ color: 'var(--text-primary)' }}>{linesTotal.toFixed(2)} ج.م</strong>
            </span>
            <span className="orders-muted">
              الربح المتوقع: <strong style={{ color: 'var(--success)' }}>{linesProfit.toFixed(2)} ج.م</strong>
            </span>
          </div>
        </div>
      )}

      {/* ── فورم إضافة صنف جديد ── */}
      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '18px',
        }}
      >
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '14px',
          }}
        >
          إضافة صنف
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Product select */}
          <div style={{ gridColumn: '1 / -1' }}>
            {label('المنتج', true)}
            {pricesLoading ? (
              <div className="orders-input" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                جارٍ تحميل المنتجات…
              </div>
            ) : prices.length === 0 ? (
              <div className="orders-feedback orders-feedback--error">
                لا يوجد منتجات معيّن لك سعر عليها بعد — تواصل مع الإدارة.
              </div>
            ) : (
              <select className="orders-select" value={draft.product_id} onChange={handleProductChange}>
                <option value="">— اختر منتج —</option>
                {prices.map((p) => (
                  <option key={p.id} value={p.product}>
                    {p.product_name} — سعر تكلفتك: {Number(p.assigned_price).toFixed(2)} ج.م
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cost info banner */}
          {selectedPrice && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '11px 14px',
                background: 'color-mix(in srgb, var(--info) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--info) 25%, var(--border))',
                borderRadius: '2px',
                fontSize: '0.83rem',
                color: 'var(--text-secondary)',
              }}
            >
              سعر التكلفة المحدد لك:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {Number(selectedPrice.assigned_price).toFixed(2)} ج.م
              </strong>
              {' '}— ربحك = (سعر بيعك − سعر التكلفة) × الكمية
            </div>
          )}

          {/* Variant select — اللون والمقاس (يظهر فقط لو المنتج فيه variants فعلاً) */}
          {draft.product_id && (variantsLoading || variants.length > 0) && (
            <div style={{ gridColumn: '1 / -1' }}>
              {label('اللون والمقاس', true)}
              {variantsLoading ? (
                <div className="orders-input" style={{ color: 'var(--text-secondary)' }}>جارٍ تحميل المتغيرات…</div>
              ) : availableVariants.length === 0 ? (
                <div className="orders-feedback orders-feedback--error">
                  المنتج ده مفيش منه مخزون متاح حالياً.
                </div>
              ) : (
                <>
                  <select className="orders-select" value={draft.variant_id} onChange={setDraftField('variant_id')}>
                    <option value="">— اختر اللون والمقاس —</option>
                    {availableVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {[v.color?.name, v.size?.name].filter(Boolean).join(' / ') || v.name}
                        {' '}— متاح: {v.stock?.quantity ?? 0} قطعة
                      </option>
                    ))}
                  </select>

                  {/* Color swatches preview */}
                  {draft.variant_id && selectedVariant?.color?.hex_code && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: selectedVariant.color.hex_code,
                          border: '2px solid var(--border-strong)',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {selectedVariant.color.name}
                        {selectedVariant.size ? ` — ${selectedVariant.size.name}` : ''}
                        {' '}&bull;{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {selectedVariant.stock?.quantity ?? 0} قطعة متاحة
                        </strong>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            {label('الكمية', true)}
            <input
              type="number"
              min="1"
              max={selectedVariant?.stock?.quantity ?? undefined}
              className="orders-input"
              value={draft.quantity}
              onChange={setDraftField('quantity')}
            />
            {selectedVariant && (
              <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                الحد الأقصى: {selectedVariant.stock?.quantity ?? '—'} قطعة
              </p>
            )}
          </div>

          {/* Sale price */}
          <div>
            {label('سعر البيع للعميل (ج.م)', true)}
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="orders-input"
              value={draft.sale_price_per_unit}
              onChange={setDraftField('sale_price_per_unit')}
              placeholder="0.00"
            />
          </div>

          {/* Profit preview (للصنف الحالي قبل الإضافة) */}
          {draftProfit !== null && (
            <div
              className={`orders-feedback ${Number(draftProfit) >= 0 ? 'orders-feedback--success' : 'orders-feedback--error'}`}
              style={{ gridColumn: '1 / -1' }}
            >
              ربح هذا الصنف:{' '}
              <strong style={{ fontSize: '1rem' }}>
                {draftProfit} ج.م
              </strong>
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={handleAddLine}
            disabled={prices.length === 0}
            className="orders-btn orders-btn--secondary orders-btn--table"
          >
            + إضافة الصنف للسلة
          </button>
        </div>
      </div>

      {/* ── قسم بيانات العميل والشحن (مرة واحدة لكل الأوردر) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
        <SectionTitle>بيانات العميل</SectionTitle>

        {/* Customer name */}
        <div>
          {label('اسم العميل', true)}
          <input
            type="text"
            className="orders-input"
            value={customer.customer_name}
            onChange={setCustomerField('customer_name')}
            placeholder="الاسم الكامل"
          />
        </div>

        {/* Customer phone */}
        <div>
          {label('تليفون العميل')}
          <input
            type="tel"
            className="orders-input"
            value={customer.customer_phone}
            onChange={setCustomerField('customer_phone')}
            placeholder="01XXXXXXXXX"
          />
        </div>

        {/* Shipping region (محافظة الشحن) */}
        <div>
          {label('محافظة الشحن', true)}
          {shippingRegionsLoading ? (
            <div className="orders-input" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              جارٍ تحميل المحافظات…
            </div>
          ) : (
            <select className="orders-select" value={customer.shipping_region_id} onChange={setCustomerField('shipping_region_id')}>
              <option value="">— اختر المحافظة —</option>
              {shippingRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — رسوم الشحن: {Number(r.price).toFixed(2)} ج.م
                </option>
              ))}
            </select>
          )}
          {selectedShippingRegion && (
            <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              رسوم الشحن: {Number(selectedShippingRegion.price).toFixed(2)} ج.م
            </p>
          )}
        </div>

        {/* Shipping address */}
        <div style={{ gridColumn: '1 / -1' }}>
          {label('عنوان الشحن بالتفصيل', true)}
          <input
            type="text"
            className="orders-input"
            value={customer.shipping_address}
            onChange={setCustomerField('shipping_address')}
            placeholder="رقم البيت، الشارع، الحي، المدينة"
          />
        </div>

      </div>

      <div style={{ marginTop: '26px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          type="button"
          onClick={handleSubmitOrder}
          disabled={mutation.isPending || lines.length === 0}
          className="orders-btn orders-btn--primary"
          style={{ minWidth: '160px' }}
        >
          {mutation.isPending ? 'جارٍ الإرسال…' : `تأكيد الأوردر (${lines.length} صنف)`}
        </button>
        {mutation.isSuccess && (
          <Motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700 }}
          >
            ✓ تم التسجيل — في انتظار تأكيد الأدمن.
          </Motion.span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Personal Withdrawal Section                                    */
/* ─────────────────────────────────────────────────────────────── */

function PersonalWithdrawalSection({ availableBalance }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: getMyWithdrawals,
  });

  const withdrawals = Array.isArray(data) ? data : (data?.results ?? []);

  const mutation = useMutation({
    mutationFn: () => createWithdrawal(amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-withdrawals'] });
      qc.invalidateQueries({ queryKey: ['my-marketer-profile'] });
      setAmount('');
      setFormError(null);
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object' && data !== null) {
        const msgs = Object.values(data).flat().join(' | ');
        setFormError(msgs || 'حدث خطأ غير متوقع.');
      } else {
        setFormError(err?.message || 'حدث خطأ غير متوقع.');
      }
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!amount || Number(amount) <= 0) return setFormError('أدخل مبلغًا أكبر من صفر.');
    if (Number(amount) > Number(availableBalance))
      return setFormError(
        `الرصيد المتاح الآن ${Number(availableBalance).toFixed(2)} ج.م فقط.`
      );
    mutation.mutate();
  };

  return (
    <div style={{ padding: '20px' }}>
      <Eyebrow>الأرباح</Eyebrow>
      <h2 className="orders-section-title">طلب سحب أرباحي الشخصية</h2>
      <p className="orders-muted" style={{ margin: '4px 0 16px', fontSize: '0.85rem' }}>
        يمكنك السحب من رصيد دورتك الشهرية الحالية فقط — الحد الأقصى:{' '}
        <strong style={{ color: 'var(--accent)' }}>
          {Number(availableBalance).toFixed(2)} ج.م
        </strong>
      </p>

      <FormError message={formError} />

      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="number"
          min="0.01"
          step="0.01"
          className="orders-input"
          style={{ width: '180px' }}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="المبلغ (ج.م)"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={mutation.isPending || Number(availableBalance) <= 0}
          className="orders-btn orders-btn--primary"
        >
          {mutation.isPending ? 'جارٍ الإرسال…' : 'طلب السحب'}
        </button>
        {mutation.isSuccess && (
          <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700 }}>
            ✓ تم إرسال طلب السحب بنجاح.
          </span>
        )}
      </div>

      <h3
        style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          marginBottom: '12px',
          color: 'var(--text-primary)',
        }}
      >
        سجل طلبات السحب
      </h3>

      {isLoading && <SkeletonRows count={3} height={44} />}
      {isError && <ErrorBox message="تعذّر تحميل سجل الطلبات." onRetry={refetch} />}

      {!isLoading && !isError && withdrawals.length === 0 && (
        <p className="orders-muted" style={{ fontSize: '0.88rem' }}>
          لا يوجد طلبات سحب سابقة.
        </p>
      )}

      {!isLoading && !isError && withdrawals.length > 0 && (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                {['المبلغ', 'الحالة', 'الدورة', 'التاريخ'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w, i) => (
                <Motion.tr
                  key={w.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td style={{ fontWeight: 700 }}>
                    {Number(w.amount).toFixed(2)} ج.م
                    {w.is_forced_settlement && (
                      <span className="badge badge-warning" style={{ marginRight: '8px' }}>
                        تصفية تلقائية
                      </span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="orders-muted">#{w.cycle_number}</td>
                  <td className="orders-muted" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(w.created_at).toLocaleDateString('ar-EG')}
                  </td>
                </Motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */

export default function TeamLeaderDashboardPage() {
  const [activeTab, setActiveTab] = useState('team');
  const [orderFormSuccess, setOrderFormSuccess] = useState(false);

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['my-marketer-profile'],
    queryFn: getMyMarketerProfile,
  });

  const handleOrderSuccess = useCallback(() => {
    setOrderFormSuccess(true);
    setTimeout(() => setOrderFormSuccess(false), 3000);
  }, []);

  const TABS = [
    { key: 'team',        label: '👥 الفريق' },
    { key: 'team-sales',  label: '📊 مبيعات الفريق' },
    { key: 'rewards',     label: '🏅 مكافآتي' },
    { key: 'new-order',   label: '+ أوردر شخصي' },
    { key: 'my-orders',   label: 'أوردراتي الشخصية' },
    { key: 'withdraw',    label: 'سحب الأرباح' },
  ];

  return (
    <section className="orders-page">

      {/* ── Header ── */}
      <header className="orders-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Eyebrow>داشبورد Team Leader</Eyebrow>
          <h1 className="orders-page__title">
            {profile ? `أهلاً، ${profile.user_name || 'القائد'} ⭐` : 'داشبورد القائد'}
          </h1>
          {profile && (
            <p className="orders-page__subtitle" style={{ marginTop: '4px' }}>
              كود المسوق:{' '}
              <strong style={{ color: 'var(--accent)', letterSpacing: '1px' }}>
                {profile.referral_code}
              </strong>
              {' · '}
              <span className="badge badge-warning">⭐ Team Leader</span>
            </p>
          )}
        </Motion.div>
      </header>

      {/* ── Profile loading / error ── */}
      {profileLoading && (
        <div style={{ marginBottom: '24px' }}>
          <SkeletonRows count={1} height={120} />
        </div>
      )}
      {profileError && (
        <div style={{ marginBottom: '24px' }}>
          <ErrorBox
            message="تعذّر تحميل بياناتك. تحقق من اتصالك وأعد المحاولة."
            onRetry={refetchProfile}
          />
        </div>
      )}

      {/* ── Stats row (personal) ── */}
      {profile && !profileLoading && <ProfileStatsRow profile={profile} />}

      {/* ── Tabs ── */}
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
        role="tablist"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === t.key ? 800 : 500,
              color: activeTab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              whiteSpace: 'nowrap',
              fontSize: '0.88rem',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </Motion.div>

      {/* ── Tab Panels ── */}
      <AnimatePresence mode="wait">
        <Motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'team' && (
            <SectionCard>
              <TeamManagementSection />
            </SectionCard>
          )}

          {activeTab === 'team-sales' && (
            <SectionCard>
              <TeamSalesSummarySection />
            </SectionCard>
          )}

          {activeTab === 'rewards' && (
            <SectionCard>
              <MyRewardsSection />
            </SectionCard>
          )}

          {activeTab === 'new-order' && (
            <SectionCard>
              <NewPersonalOrderForm onSuccess={handleOrderSuccess} />
              {orderFormSuccess && (
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="orders-feedback orders-feedback--success"
                  style={{ margin: '0 20px 20px' }}
                >
                  ✓ تم تسجيل الأوردر — يمكنك الاطلاع عليه في &quot;أوردراتي الشخصية&quot;.
                </Motion.div>
              )}
            </SectionCard>
          )}

          {activeTab === 'my-orders' && (
            <SectionCard>
              <PersonalOrdersSection />
            </SectionCard>
          )}

          {activeTab === 'withdraw' && (
            <SectionCard>
              <PersonalWithdrawalSection
                availableBalance={profile?.monthly_profit_balance ?? 0}
              />
            </SectionCard>
          )}
        </Motion.div>
      </AnimatePresence>
    </section>
  );
}