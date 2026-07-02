// frontend/src/pages/marketers/MarketerAdminDetailsPage.jsx
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMarketerDetail,
  getMarketerProductPrices,
  createMarketerProductPrice,
  updateMarketerProductPrice,
  deleteMarketerProductPrice,
  promoteMarketerToLeader,
  updateMarketerStatus,
  getAllProducts,
} from '../../services/marketerAdminService';
import '../orders/orders.css';

const STATUS_LABELS = { active: 'نشط', suspended: 'موقوف' };
const ORDER_STATUS_LABELS = { pending: 'معلق', confirmed: 'مؤكد', rejected: 'مرفوض' };
const REWARD_STATUS_LABELS = { pending: 'معلق', approved: 'معتمد', paid: 'مدفوع' };

export default function MarketerAdminDetailsPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [confirmPromote, setConfirmPromote] = useState(false);
  const [priceForm, setPriceForm] = useState({ productId: '', price: '' });
  const [editingPrice, setEditingPrice] = useState(null); // { id, price }
  const [priceError, setPriceError] = useState('');

  const { data: marketer, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-marketer', id],
    queryFn: () => getMarketerDetail(id),
  });

  const { data: prices = [], refetch: refetchPrices } = useQuery({
    queryKey: ['admin-marketer-prices', id],
    queryFn: () => getMarketerProductPrices(id),
    select: (d) => Array.isArray(d) ? d : (d?.results ?? []),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: getAllProducts,
    select: (d) => d?.results || d?.items || d || [],
  });

  const promoteMutation = useMutation({
    mutationFn: () => promoteMarketerToLeader(id),
    onSuccess: () => { qc.invalidateQueries(['admin-marketer', id]); setConfirmPromote(false); },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateMarketerStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['admin-marketer', id]),
  });

  const createPriceMutation = useMutation({
    mutationFn: (payload) => createMarketerProductPrice(id, payload),
    onSuccess: () => { refetchPrices(); setPriceForm({ productId: '', price: '' }); setPriceError(''); },
    onError: (e) => setPriceError(e?.response?.data?.detail || 'حدث خطأ أثناء الإضافة.'),
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ priceId, price }) => updateMarketerProductPrice(priceId, { assigned_price: price }),
    onSuccess: () => { refetchPrices(); setEditingPrice(null); },
  });

  const deletePriceMutation = useMutation({
    mutationFn: (priceId) => deleteMarketerProductPrice(priceId),
    onSuccess: () => refetchPrices(),
  });

  const handleCreatePrice = () => {
    setPriceError('');
    if (!priceForm.productId) return setPriceError('اختر منتجاً.');
    const p = parseFloat(priceForm.price);
    if (!p || p <= 0) return setPriceError('أدخل سعراً صحيحاً أكبر من صفر.');
    createPriceMutation.mutate({ product: priceForm.productId, assigned_price: priceForm.price });
  };

  const tabs = [
    { key: 'info', label: 'معلومات عامة' },
    { key: 'pricing', label: 'التسعير' },
    { key: 'orders', label: 'الأوردرات' },
    { key: 'rewards', label: 'المكافآت' },
    ...(marketer?.role === 'team_leader' ? [{ key: 'team', label: 'الفريق' }] : []),
  ];

  if (isLoading) return (
    <section className="orders-page">
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>جارٍ التحميل…</div>
    </section>
  );

  if (isError) return (
    <section className="orders-page">
      <div className="orders-error" role="alert">
        <p>{error instanceof Error ? error.message : 'تعذّر تحميل بيانات المسوق.'}</p>
        <button type="button" onClick={() => refetch()} className="orders-btn">إعادة المحاولة</button>
      </div>
    </section>
  );

  const m = marketer;
  const recentOrders = m?.recent_orders || [];
  const teamMembers = m?.team_members || [];
  const rewards = m?.rewards || [];

  return (
    <section className="orders-page">
      {/* Header */}
      <header className="orders-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--accent)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
            ✦ نظام المسوقين
          </div>
          <h1 className="orders-page__title">
            {m?.user?.username || m?.user?.email || `مسوق #${id}`}
          </h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {m?.referral_code} &nbsp;·&nbsp;
            <span style={{ color: m?.status === 'active' ? '#22c55e' : '#ef4444' }}>
              {STATUS_LABELS[m?.status] || m?.status}
            </span>
            &nbsp;·&nbsp;
            <span style={{ color: 'var(--accent)' }}>
              {m?.role === 'team_leader' ? 'قائد فريق' : 'مسوق'}
            </span>
          </p>
        </Motion.div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {m?.role !== 'team_leader' && (
            <button className="orders-btn" style={{ background: 'var(--accent)', color: '#000' }} onClick={() => setConfirmPromote(true)}>
              ترقية لقائد فريق
            </button>
          )}
          <button
            className="orders-btn orders-btn--secondary"
            style={{ color: m?.status === 'active' ? '#ef4444' : '#22c55e' }}
            disabled={statusMutation.isLoading}
            onClick={() => statusMutation.mutate(m?.status === 'active' ? 'suspended' : 'active')}
          >
            {m?.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
          </button>
          <Link to="/dashboard/marketers" className="orders-btn orders-btn--secondary">
            ← العودة للقائمة
          </Link>
        </div>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '8px' }}>
        {[
          { label: 'أوردرات الشهر', value: m?.monthly_completed_orders_count ?? 0 },
          { label: 'الرصيد الشهري', value: `${Number(m?.monthly_profit_balance ?? 0).toFixed(2)} ج` },
          { label: 'إجمالي الأوردرات', value: m?.lifetime_total_orders ?? 0 },
          { label: 'إجمالي الأرباح', value: `${Number(m?.lifetime_total_profit ?? 0).toFixed(2)} ج` },
        ].map((stat) => (
          <div key={stat.label} className="orders-surface" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '16px', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.key ? 700 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Tab: Info ── */}
        {activeTab === 'info' && (
          <Motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="orders-surface" style={{ padding: '24px', display: 'grid', gap: '16px' }}>
              <div className="orders-details-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'البريد الإلكتروني', value: m?.user?.email },
                  { label: 'كود المسوق', value: m?.referral_code },
                  { label: 'تاريخ الانضمام', value: m?.created_at ? new Date(m.created_at).toLocaleDateString('ar-EG') : '—' },
                  { label: 'تاريخ الترقية', value: m?.promoted_to_leader_at ? new Date(m.promoted_to_leader_at).toLocaleDateString('ar-EG') : '—' },
                  { label: 'القائد السابق (credited)', value: m?.credited_team_leader_email || '—' },
                  { label: 'الدورة الحالية', value: `#${m?.current_cycle_number ?? 0}` },
                ].map((row) => (
                  <div key={row.label}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{row.label}</div>
                    <div style={{ fontWeight: 600 }}>{row.value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </Motion.div>
        )}

        {/* ── Tab: Pricing ── */}
        {activeTab === 'pricing' && (
          <Motion.div key="pricing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="orders-surface" style={{ padding: '24px', display: 'grid', gap: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>أسعار المنتجات لهذا المسوق</h3>

              {/* Add price form */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, marginBottom: '12px' }}>
                  + إضافة سعر لمنتج جديد
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
                  <select
                    value={priceForm.productId}
                    onChange={(e) => setPriceForm((p) => ({ ...p, productId: e.target.value }))}
                    className="orders-input"
                  >
                    <option value="">اختر منتجاً…</option>
                    {allProducts.map((prod) => (
                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={priceForm.price}
                    onChange={(e) => setPriceForm((p) => ({ ...p, price: e.target.value }))}
                    className="orders-input"
                    placeholder="السعر (ج)"
                    style={{ width: '120px' }}
                  />
                  <button
                    className="orders-btn"
                    onClick={handleCreatePrice}
                    disabled={createPriceMutation.isLoading}
                    style={{ background: 'var(--accent)', color: '#000' }}
                  >
                    {createPriceMutation.isLoading ? '…' : 'إضافة'}
                  </button>
                </div>
                {priceError && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>{priceError}</p>
                )}
              </div>

              {/* Prices table */}
              {prices.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                  لا يوجد تسعير محدد لهذا المسوق بعد.
                </p>
              ) : (
                <table className="orders-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>السعر المحدد (ج)</th>
                      <th>آخر تعديل</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((pr) => (
                      <tr key={pr.id}>
                        <td>{pr.product_name || `منتج #${pr.product}`}</td>
                        <td>
                          {editingPrice?.id === pr.id ? (
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editingPrice.price}
                              onChange={(e) => setEditingPrice((p) => ({ ...p, price: e.target.value }))}
                              className="orders-input"
                              style={{ width: '100px' }}
                            />
                          ) : (
                            Number(pr.assigned_price).toFixed(2)
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {pr.updated_at ? new Date(pr.updated_at).toLocaleDateString('ar-EG') : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {editingPrice?.id === pr.id ? (
                              <>
                                <button
                                  className="orders-btn"
                                  style={{ fontSize: '11px', padding: '4px 10px', background: 'var(--accent)', color: '#000' }}
                                  disabled={updatePriceMutation.isLoading}
                                  onClick={() => updatePriceMutation.mutate({ priceId: pr.id, price: editingPrice.price })}
                                >
                                  حفظ
                                </button>
                                <button
                                  className="orders-btn orders-btn--secondary"
                                  style={{ fontSize: '11px', padding: '4px 10px' }}
                                  onClick={() => setEditingPrice(null)}
                                >
                                  إلغاء
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="orders-btn orders-btn--secondary"
                                  style={{ fontSize: '11px', padding: '4px 10px' }}
                                  onClick={() => setEditingPrice({ id: pr.id, price: pr.assigned_price })}
                                >
                                  تعديل
                                </button>
                                <button
                                  className="orders-btn orders-btn--secondary"
                                  style={{ fontSize: '11px', padding: '4px 10px', color: '#ef4444' }}
                                  disabled={deletePriceMutation.isLoading}
                                  onClick={() => deletePriceMutation.mutate(pr.id)}
                                >
                                  حذف
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Motion.div>
        )}

        {/* ── Tab: Orders ── */}
        {activeTab === 'orders' && (
          <Motion.div key="orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="orders-surface" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>آخر 20 أوردر</h3>
              {recentOrders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>لا توجد أوردرات بعد.</p>
              ) : (
                <table className="orders-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>رقم الأوردر</th>
                      <th>المنتج</th>
                      <th>الكمية</th>
                      <th>الربح</th>
                      <th>الحالة</th>
                      <th>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{o.product_name || `منتج #${o.product}`}</td>
                        <td style={{ textAlign: 'center' }}>{o.quantity}</td>
                        <td>{Number(o.profit_amount || 0).toFixed(2)} ج</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                            background: o.status === 'confirmed' ? 'rgba(34,197,94,0.15)' : o.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                            color: o.status === 'confirmed' ? '#22c55e' : o.status === 'rejected' ? '#ef4444' : 'var(--text-muted)',
                          }}>
                            {ORDER_STATUS_LABELS[o.status] || o.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {o.created_at ? new Date(o.created_at).toLocaleDateString('ar-EG') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Motion.div>
        )}

        {/* ── Tab: Rewards ── */}
        {activeTab === 'rewards' && (
          <Motion.div key="rewards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="orders-surface" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>سجل المكافآت</h3>
              {rewards.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>لا توجد مكافآت بعد.</p>
              ) : (
                <table className="orders-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>الدورة</th>
                      <th>مبيعات الفريق وقتها</th>
                      <th>قيمة المكافأة</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map((r) => (
                      <tr key={r.id}>
                        <td>#{r.cycle_number}</td>
                        <td style={{ textAlign: 'center' }}>{r.team_sales_count_at_award}</td>
                        <td>{Number(r.reward_amount || 0).toFixed(2)} ج</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                            background: r.status === 'paid' ? 'rgba(34,197,94,0.15)' : r.status === 'approved' ? 'rgba(var(--accent-rgb),0.15)' : 'rgba(255,255,255,0.06)',
                            color: r.status === 'paid' ? '#22c55e' : r.status === 'approved' ? 'var(--accent)' : 'var(--text-muted)',
                          }}>
                            {REWARD_STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Motion.div>
        )}

        {/* ── Tab: Team (team leaders only) ── */}
        {activeTab === 'team' && m?.role === 'team_leader' && (
          <Motion.div key="team" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="orders-surface" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>
                أفراد الفريق ({teamMembers.length})
              </h3>
              {teamMembers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>لا يوجد أعضاء في الفريق بعد.</p>
              ) : (
                <table className="orders-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>اسم المسوق</th>
                      <th>أوردرات الشهر</th>
                      <th>الحالة</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((tm) => (
                      <tr key={tm.id}>
                        <td>
                          <Link to={`/dashboard/marketers/${tm.id}`} style={{ color: 'var(--accent)' }}>
                            {tm.user?.username || `#${tm.id}`}
                          </Link>
                        </td>
                        <td style={{ textAlign: 'center' }}>{tm.monthly_completed_orders_count ?? 0}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                            background: tm.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: tm.status === 'active' ? '#22c55e' : '#ef4444',
                          }}>
                            {STATUS_LABELS[tm.status] || tm.status}
                          </span>
                        </td>
                        <td>
                          <Link to={`/dashboard/marketers/${tm.id}`} className="orders-btn orders-btn--secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
                            تفاصيل
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Promote Modal */}
      <AnimatePresence>
        {confirmPromote && (
          <Motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
            onClick={() => setConfirmPromote(false)}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>تأكيد الترقية اليدوية</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
                هتترقّي <strong style={{ color: 'var(--text)' }}>{m?.user?.username}</strong> لقائد فريق يدوياً بدون أي شروط. متأكد؟
              </p>
              {promoteMutation.isError && (
                <div className="orders-error" style={{ marginBottom: '16px' }}>
                  {promoteMutation.error?.response?.data?.detail || 'حدث خطأ.'}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="orders-btn orders-btn--secondary" onClick={() => setConfirmPromote(false)} disabled={promoteMutation.isLoading}>إلغاء</button>
                <button className="orders-btn" style={{ background: 'var(--accent)', color: '#000' }} onClick={() => promoteMutation.mutate()} disabled={promoteMutation.isLoading}>
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