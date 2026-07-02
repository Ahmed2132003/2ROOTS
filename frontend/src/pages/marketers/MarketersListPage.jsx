// frontend/src/pages/marketers/MarketersListPage.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMarketers, promoteMarketerToLeader, updateMarketerStatus } from '../../services/marketerAdminService';
import OrdersPagination from '../../components/orders/OrdersPagination';
import '../orders/orders.css';

const ROLE_LABELS = { marketer: 'مسوق', team_leader: 'قائد فريق' };
const STATUS_LABELS = { active: 'نشط', suspended: 'موقوف' };

const DEFAULT_FILTERS = { search: '', role: '', status: '', page: 1, pageSize: 10 };

export default function MarketersListPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [confirmPromote, setConfirmPromote] = useState(null); // { id, name }

  const queryParams = useMemo(() => ({
    search: filters.search || undefined,
    role: filters.role || undefined,
    status: filters.status || undefined,
    page: filters.page,
    page_size: filters.pageSize,
  }), [filters]);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['admin-marketers', queryParams],
    queryFn: () => getMarketers(queryParams),
    keepPreviousData: true,
  });

  const promoteMutation = useMutation({
    mutationFn: (id) => promoteMarketerToLeader(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-marketers']);
      setConfirmPromote(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateMarketerStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['admin-marketers']),
  });

  const setFilter = (patch) => setFilters((p) => ({ ...p, ...patch, page: 1 }));
  const marketers = data?.results || data?.items || data || [];
  const total = data?.count || data?.total || 0;

  return (
    <section className="orders-page">
      {/* Header */}
      <header className="orders-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--accent)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
            ✦ نظام المسوقين
          </div>
          <h1 className="orders-page__title">المسوقون</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            إدارة المسوقين — التسعير، الترقية، الحالة
          </p>
        </Motion.div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/dashboard/marketer-orders" className="orders-btn orders-btn--secondary">مراجعة الأوردرات</Link>
          <Link to="/dashboard/withdrawals" className="orders-btn orders-btn--secondary">طلبات السحب</Link>
          <Link to="/dashboard" className="orders-btn orders-btn--secondary">الداشبورد</Link>
        </div>
      </header>

      {/* Filters */}
      <div className="orders-surface">
        <div className="orders-filters" style={{ gridTemplateColumns: '1fr auto auto' }}>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="orders-input"
            placeholder="بحث بالاسم أو الكود…"
          />
          <select value={filters.role} onChange={(e) => setFilter({ role: e.target.value })} className="orders-input">
            <option value="">كل الأدوار</option>
            <option value="marketer">مسوق</option>
            <option value="team_leader">قائد فريق</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })} className="orders-input">
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
          </select>
        </div>
      </div>

      {isFetching && !isLoading && (
        <p className="orders-refresh">✦ جارٍ التحديث…</p>
      )}

      {isError && (
        <div className="orders-error" role="alert">
          <p>{error instanceof Error ? error.message : 'تعذّر تحميل المسوقين.'}</p>
          <button type="button" onClick={() => refetch()} className="orders-btn">إعادة المحاولة</button>
        </div>
      )}

      {/* Table */}
      {!isError && (
        <Motion.div
          className="orders-surface"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>جارٍ التحميل…</div>
          ) : marketers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد مسوقون مطابقون للفلتر.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="orders-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>كود الإحالة</th>
                    <th>الدور</th>
                    <th>أوردرات الشهر</th>
                    <th>الرصيد الشهري</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {marketers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link to={`/dashboard/marketers/${m.id}`} style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '14px' }}>
                          {m.username || m.email || `مسوق #${m.id}`}
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {m.email && m.username ? m.email : `#${m.id}`}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {m.referral_code}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: m.role === 'team_leader' ? 'rgba(var(--accent-rgb),0.15)' : 'rgba(255,255,255,0.06)',
                          color: m.role === 'team_leader' ? 'var(--accent)' : 'var(--text-muted)',
                        }}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{m.monthly_completed_orders_count ?? 0}</td>
                      <td style={{ textAlign: 'center' }}>{Number(m.monthly_profit_balance ?? 0).toFixed(2)} ج</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: m.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: m.status === 'active' ? '#22c55e' : '#ef4444',
                        }}>
                          {STATUS_LABELS[m.status] || m.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <Link to={`/dashboard/marketers/${m.id}`} className="orders-btn orders-btn--secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
                            تفاصيل
                          </Link>
                          {m.role !== 'team_leader' && (
                            <button
                              className="orders-btn"
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                              onClick={() => setConfirmPromote({ id: m.id, name: m.username || m.email || `#${m.id}` })}
                            >
                              ترقية لقائد
                            </button>
                          )}
                          <button
                            className="orders-btn orders-btn--secondary"
                            style={{ fontSize: '11px', padding: '4px 10px', color: m.status === 'active' ? '#ef4444' : '#22c55e' }}
                            disabled={statusMutation.isLoading}
                            onClick={() => statusMutation.mutate({ id: m.id, status: m.status === 'active' ? 'suspended' : 'active' })}
                          >
                            {m.status === 'active' ? 'إيقاف' : 'تفعيل'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <OrdersPagination
            page={filters.page}
            total={total}
            pageSize={filters.pageSize}
            onPageChange={(next) => setFilters((p) => ({ ...p, page: Math.max(1, next) }))}
          />
        </Motion.div>
      )}

      {/* Confirm Promote Modal */}
      <AnimatePresence>
        {confirmPromote && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, padding: '16px',
            }}
            onClick={() => setConfirmPromote(null)}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '420px',
                width: '100%',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                تأكيد الترقية اليدوية
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.6 }}>
                هتترقّي <strong style={{ color: 'var(--text)' }}>{confirmPromote.name}</strong> يدوياً لقائد فريق بدون شروط.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
                هذا الإجراء لا يمكن التراجع عنه. متأكد؟
              </p>

              {promoteMutation.isError && (
                <div className="orders-error" style={{ marginBottom: '16px', textAlign: 'right' }}>
                  {promoteMutation.error?.response?.data?.detail || 'حدث خطأ، حاول مرة أخرى.'}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="orders-btn orders-btn--secondary"
                  onClick={() => setConfirmPromote(null)}
                  disabled={promoteMutation.isLoading}
                >
                  إلغاء
                </button>
                <button
                  className="orders-btn"
                  onClick={() => promoteMutation.mutate(confirmPromote.id)}
                  disabled={promoteMutation.isLoading}
                  style={{ background: 'var(--accent)', color: '#000' }}
                >
                  {promoteMutation.isLoading ? 'جارٍ الترقية…' : 'نعم، ترقية الآن'}
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}