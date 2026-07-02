// frontend/src/pages/marketers/TeamRewardsPage.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamRewards, updateTeamRewardStatus } from '../../services/marketerAdminService';
import OrdersPagination from '../../components/orders/OrdersPagination';
import '../orders/orders.css';

const STATUS_LABELS = { pending: 'معلق', approved: 'معتمد', paid: 'مدفوع' };
const STATUS_COLORS = {
  pending: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
  approved: { bg: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' },
  paid: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
};

const DEFAULT_FILTERS = { status: '', page: 1, pageSize: 15 };

export default function TeamRewardsPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [actionError, setActionError] = useState('');

  const queryParams = useMemo(() => ({
    status: filters.status || undefined,
    page: filters.page,
    page_size: filters.pageSize,
  }), [filters]);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['admin-team-rewards', queryParams],
    queryFn: () => getTeamRewards(queryParams),
    keepPreviousData: true,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateTeamRewardStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['admin-team-rewards']); setActionError(''); },
    onError: (e) => setActionError(e?.response?.data?.detail || 'تعذّر تحديث الحالة.'),
  });

  const setFilter = (patch) => setFilters((p) => ({ ...p, ...patch, page: 1 }));
  const rewards = data?.results || data?.items || data || [];
  const total = data?.count || data?.total || 0;

  return (
    <section className="orders-page">
      {/* Header */}
      <header className="orders-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--accent)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
            ✦ نظام المسوقين
          </div>
          <h1 className="orders-page__title">مكافآت قادة الفرق</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            مراجعة واعتماد مكافآت القادة حسب مبيعات فرقهم الشهرية
          </p>
        </Motion.div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/dashboard/reward-tiers" className="orders-btn orders-btn--secondary">إعدادات الدرجات</Link>
          <Link to="/dashboard/marketers" className="orders-btn orders-btn--secondary">← المسوقون</Link>
        </div>
      </header>

      {/* Filter */}
      <div className="orders-surface">
        <div className="orders-filters" style={{ gridTemplateColumns: 'auto' }}>
          <select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })} className="orders-input" style={{ maxWidth: '220px' }}>
            <option value="">كل الحالات</option>
            <option value="pending">معلق</option>
            <option value="approved">معتمد</option>
            <option value="paid">مدفوع</option>
          </select>
        </div>
      </div>

      {isFetching && !isLoading && <p className="orders-refresh">✦ جارٍ التحديث…</p>}

      {actionError && (
        <div className="orders-error" role="alert" style={{ marginBottom: '12px' }}>
          {actionError}
          <button type="button" onClick={() => setActionError('')} style={{ marginRight: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {isError && (
        <div className="orders-error" role="alert">
          <p>{error instanceof Error ? error.message : 'تعذّر تحميل المكافآت.'}</p>
          <button type="button" onClick={() => refetch()} className="orders-btn">إعادة المحاولة</button>
        </div>
      )}

      {!isError && (
        <Motion.div className="orders-surface" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>جارٍ التحميل…</div>
          ) : rewards.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              لا توجد مكافآت مطابقة.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="orders-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>القائد</th>
                    <th>الدورة</th>
                    <th>مبيعات الفريق وقتها</th>
                    <th>قيمة المكافأة</th>
                    <th>الحالة الحالية</th>
                    <th>تغيير الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((r) => {
                    const sc = STATUS_COLORS[r.status] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' };
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link to={`/dashboard/marketers/${r.marketer}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            {r.marketer_name || `قائد #${r.marketer}`}
                          </Link>
                        </td>
                        <td style={{ textAlign: 'center' }}>#{r.cycle_number}</td>
                        <td style={{ textAlign: 'center' }}>{r.team_sales_count_at_award} أوردر</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '15px' }}>
                          {Number(r.reward_amount || 0).toFixed(2)} ج
                        </td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: sc.bg, color: sc.color }}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {r.status === 'pending' && (
                              <button
                                className="orders-btn"
                                style={{ fontSize: '11px', padding: '4px 10px', background: 'var(--accent)', color: '#000' }}
                                disabled={statusMutation.isLoading}
                                onClick={() => statusMutation.mutate({ id: r.id, status: 'approved' })}
                              >
                                اعتماد
                              </button>
                            )}
                            {r.status === 'approved' && (
                              <button
                                className="orders-btn"
                                style={{ fontSize: '11px', padding: '4px 10px', background: '#22c55e', color: '#000', border: 'none' }}
                                disabled={statusMutation.isLoading}
                                onClick={() => statusMutation.mutate({ id: r.id, status: 'paid' })}
                              >
                                ✓ تم الدفع
                              </button>
                            )}
                            {r.status === 'paid' && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>مكتمل</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
    </section>
  );
}