// frontend/src/pages/marketers/RewardTiersSettingsPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRewardTiers, createRewardTier, updateRewardTier } from '../../services/marketerAdminService';
import '../orders/orders.css';

const EMPTY_FORM = { min_team_sales: '', reward_amount: '', is_active: true };

export default function RewardTiersSettingsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');

  const { data: tiers = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reward-tiers'],
    queryFn: getRewardTiers,
    select: (d) => d?.results || d?.items || d || [],
  });

  const createMutation = useMutation({
    mutationFn: createRewardTier,
    onSuccess: () => { qc.invalidateQueries(['reward-tiers']); resetForm(); },
    onError: (e) => setFormError(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || 'حدث خطأ.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateRewardTier(id, payload),
    onSuccess: () => { qc.invalidateQueries(['reward-tiers']); resetForm(); },
    onError: (e) => setFormError(e?.response?.data?.detail || 'حدث خطأ.'),
  });

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); setFormError(''); };

  const handleEdit = (tier) => {
    setForm({ min_team_sales: tier.min_team_sales, reward_amount: tier.reward_amount, is_active: tier.is_active });
    setEditingId(tier.id);
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = () => {
    setFormError('');
    const min = parseInt(form.min_team_sales);
    const reward = parseFloat(form.reward_amount);
    if (!min || min <= 0) return setFormError('أدخل حد أدنى صحيح للمبيعات (أكبر من صفر).');
    if (!reward || reward <= 0) return setFormError('أدخل قيمة مكافأة صحيحة (أكبر من صفر).');
    const payload = { min_team_sales: min, reward_amount: reward, is_active: form.is_active };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  };

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <section className="orders-page">
      {/* Header */}
      <header className="orders-page__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--accent)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
            ✦ نظام المسوقين
          </div>
          <h1 className="orders-page__title">درجات المكافآت</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            تحديد الدرجات — مكافأة قائد الفريق حسب مبيعات فريقه الشهرية
          </p>
        </Motion.div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="orders-btn" style={{ background: 'var(--accent)', color: '#000' }} onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}>
            + درجة جديدة
          </button>
          <Link to="/dashboard/team-rewards" className="orders-btn orders-btn--secondary">مكافآت القادة</Link>
          <Link to="/dashboard" className="orders-btn orders-btn--secondary">الداشبورد</Link>
        </div>
      </header>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="orders-surface" style={{ padding: '24px', marginBottom: '8px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>
                {editingId ? 'تعديل الدرجة' : 'إضافة درجة جديدة'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    الحد الأدنى للمبيعات (عدد أوردرات)
                  </label>
                  <input
                    type="number" min="1" step="1"
                    value={form.min_team_sales}
                    onChange={(e) => setForm((p) => ({ ...p, min_team_sales: e.target.value }))}
                    className="orders-input"
                    placeholder="مثال: 20"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    قيمة المكافأة (جنيه)
                  </label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={form.reward_amount}
                    onChange={(e) => setForm((p) => ({ ...p, reward_amount: e.target.value }))}
                    className="orders-input"
                    placeholder="مثال: 500"
                  />
                </div>
                <div style={{ paddingBottom: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                    />
                    نشطة
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', paddingBottom: '2px' }}>
                  <button
                    className="orders-btn"
                    style={{ background: 'var(--accent)', color: '#000' }}
                    onClick={handleSubmit}
                    disabled={isSaving}
                  >
                    {isSaving ? '…' : editingId ? 'حفظ' : 'إضافة'}
                  </button>
                  <button className="orders-btn orders-btn--secondary" onClick={resetForm} disabled={isSaving}>
                    إلغاء
                  </button>
                </div>
              </div>
              {formError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '10px' }}>{formError}</p>}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {isError && (
        <div className="orders-error" role="alert">
          <p>{error instanceof Error ? error.message : 'تعذّر تحميل الدرجات.'}</p>
          <button type="button" onClick={() => refetch()} className="orders-btn">إعادة المحاولة</button>
        </div>
      )}

      {/* Tiers Table */}
      {!isError && (
        <Motion.div className="orders-surface" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>جارٍ التحميل…</div>
          ) : tiers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>لا توجد درجات مكافآت بعد.</p>
              <button className="orders-btn" style={{ background: 'var(--accent)', color: '#000' }} onClick={() => setShowForm(true)}>
                إضافة أول درجة
              </button>
            </div>
          ) : (
            <table className="orders-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>الحد الأدنى للمبيعات</th>
                  <th>قيمة المكافأة</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {[...tiers].sort((a, b) => a.min_team_sales - b.min_team_sales).map((tier) => (
                  <tr key={tier.id}>
                    <td>
                      <span style={{ fontWeight: 700 }}>{tier.min_team_sales}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginRight: '6px' }}>أوردر فأكثر</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '16px' }}>
                      {Number(tier.reward_amount).toFixed(2)} ج
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                        background: tier.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                        color: tier.is_active ? '#22c55e' : 'var(--text-muted)',
                      }}>
                        {tier.is_active ? 'نشطة' : 'معطلة'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="orders-btn orders-btn--secondary"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          onClick={() => handleEdit(tier)}
                        >
                          تعديل
                        </button>
                        <button
                          className="orders-btn orders-btn--secondary"
                          style={{ fontSize: '11px', padding: '4px 10px', color: tier.is_active ? '#ef4444' : '#22c55e' }}
                          onClick={() => updateRewardTier(tier.id, { is_active: !tier.is_active }).then(() => qc.invalidateQueries(['reward-tiers']))}
                        >
                          {tier.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Motion.div>
      )}
    </section>
  );
}