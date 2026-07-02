// frontend/src/pages/marketers/WithdrawalsReviewPage.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWithdrawals, approveWithdrawal, rejectWithdrawal } from '../../services/marketerAdminService';
import OrdersPagination from '../../components/orders/OrdersPagination';
import '../orders/orders.css';

const STATUS_LABELS = { pending: 'معلق', approved: 'معتمد', paid: 'مدفوع', rejected: 'مرفوض' };
const STATUS_COLORS = {
  pending: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
  approved: { bg: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' },
  paid: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  rejected: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
};

const DEFAULT_FILTERS = { status: 'pending', page: 1, pageSize: 15 };

export default function WithdrawalsReviewPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [actionError, setActionError] = useState('');

  const queryParams = useMemo(() => ({
    status: filters.status || undefined,
    page: filters.page,
    page_size: filters.pageSize,
  }), [filters]);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['admin-withdrawals', queryParams],
    queryFn: () => getWithdrawals(queryParams),
    keepPreviousData: true,
    refetchInterval: filters.status === 'pending' ? 30_000 : false,
  });

  const approveMutation = useMutation({
    mutationFn: approveWithdrawal,
    onSuccess: () => { qc.invalidateQueries(['admin-withdrawals']); setActionError(''); },
    onError: (e) => setActionError(e?.response?.data?.detail || 'تعذّر اعتماد الطلب.'),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectWithdrawal,
    onSuccess: () => { qc.invalidateQueries(['admin-withdrawals']); setActionError(''); },
    onError: (e) => setActionError(e?.response?.data?.detail || 'تعذّر رفض الطلب.'),
  });

  const setFilter = (patch) => setFilters((p) => ({ ...p, ...patch, page: 1 }));
  const withdrawals = data?.results || data?.items || data || [];
  const total = data?.count || data?.total || 0;
  const pendingCount = filters.status === 'pending' ? total : null;

  return (
    <section className="orders-page">
      {/* Header */}
      <header className="orders-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--accent)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
            ✦ نظام المسوقين
          </div>
          <h1 className="orders-page__title">
            طلبات سحب الأرباح
            {pendingCount > 0 && (
              <span style={{ marginRight: '10px', background: '#eab308', color: '#000', borderRadius: '12px', padding: '2px 10px', fontSize: '13px', fontWeight: 800 }}>
                {pendingCount} معلق
              </span>
            )}
          </h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            مراجعة واعتماد طلبات سحب أرباح المسوقين
          </p>
        </Motion.div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/dashboard/marketers" className="orders-btn orders-btn--secondary">← المسوقون</Link>
          <Link to="/dashboard" className="orders-btn orders-btn--secondary">الداشبورد</Link>
        </div>
      </header>

      {/* Filter */}
      <div className="orders-surface">
        <div className="orders-filters" style={{ gridTemplateColumns: 'auto' }}>
          <select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })} className="orders-input" style={{ maxWidth: '220px' }}>
            <option value="pending">معلق فقط</option>
            <option value="approved">معتمد</option>
            <option value="paid">مدفوع</option>
            <option value="rejected">مرفوض</option>
            <option value="">الكل</option>
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
          <p>{error instanceof Error ? error.message : 'تعذّر تحميل الطلبات.'}</p>
          <button type="button" onClick={() => refetch()} className="orders-btn">إعادة المحاولة</button>
        </div>
      )}

      {!isError && (
        <Motion.div className="orders-surface" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>جارٍ التحميل…</div>
          ) : withdrawals.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
              <p style={{ color: 'var(--text-muted)' }}>
                {filters.status === 'pending' ? 'لا توجد طلبات سحب معلقة.' : 'لا توجد طلبات مطابقة.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="orders-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المسوق</th>
                    <th>المبلغ المطلوب</th>
                    <th>الدورة</th>
                    <th>نوع الطلب</th>
                    <th>تاريخ الطلب</th>
                    <th>الحالة</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => {
                    const sc = STATUS_COLORS[w.status] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' };
                    return (
                      <tr key={w.id}>
                        <td style={{ color: 'var(--accent)', fontWeight: 700 }}>#{w.id}</td>
                        <td>
                          <Link to={`/dashboard/marketers/${w.marketer}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            {w.marketer_name || w.marketer_email || `مسوق #${w.marketer}`}
                          </Link>
                          {w.marketer_referral_code && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              كود: {w.marketer_referral_code}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '15px' }}>
                          {Number(w.amount || 0).toFixed(2)} ج
                        </td>
                        <td style={{ textAlign: 'center' }}>#{w.cycle_number}</td>
                        <td>
                          {w.is_forced_settlement ? (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                              تصفية إجبارية
                            </span>
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                              طوعي
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {w.created_at ? new Date(w.created_at).toLocaleDateString('ar-EG') : '—'}
                        </td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: sc.bg, color: sc.color }}>
                            {STATUS_LABELS[w.status] || w.status}
                          </span>
                        </td>
                        <td>
                          {w.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="orders-btn"
                                style={{ fontSize: '11px', padding: '5px 12px', background: '#22c55e', color: '#000', border: 'none' }}
                                disabled={approveMutation.isLoading || rejectMutation.isLoading}
                                onClick={() => approveMutation.mutate(w.id)}
                              >
                                ✓ اعتماد
                              </button>
                              <button
                                className="orders-btn orders-btn--secondary"
                                style={{ fontSize: '11px', padding: '5px 12px', color: '#ef4444' }}
                                disabled={approveMutation.isLoading || rejectMutation.isLoading}
                                onClick={() => rejectMutation.mutate(w.id)}
                              >
                                ✕ رفض
                              </button>
                            </div>
                          )}
                          {w.status !== 'pending' && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                          )}
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