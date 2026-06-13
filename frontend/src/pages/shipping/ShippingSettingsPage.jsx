import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion as Motion } from 'framer-motion';
import {
  createShippingRegion,
  deleteShippingRegion,
  getShippingRegions,
  updateShippingRegion,
} from '../../services/shippingService';
import '../orders/orders.css';

function normalizeShippingRegions(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function ShippingSettingsPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', price: '' });
  const [editing, setEditing] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['shipping-regions'],
    queryFn: getShippingRegions,
  });

  const regions = normalizeShippingRegions(data);

  const addMut = useMutation({
    mutationFn: createShippingRegion,
    onSuccess: () => {
      setForm({ name: '', price: '' });
      qc.invalidateQueries({ queryKey: ['shipping-regions'] });
    },
  });

  const editMut = useMutation({
    mutationFn: ({ id, payload }) => updateShippingRegion(id, payload),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['shipping-regions'] });
    },
  });

  const delMut = useMutation({
    mutationFn: deleteShippingRegion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipping-regions'] }),
  });

  return (
    <section className="orders-page" dir={isRTL ? 'rtl' : 'ltr'}>

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
          <h1 className="orders-page__title">{tr('Shipping Settings', 'إعدادات الشحن')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr(
              'Configure shipping governorates and delivery prices.',
              'إدارة محافظات الشحن وأسعار التوصيل.'
            )}
          </p>
        </Motion.div>

        <Link to="/dashboard" className="orders-btn orders-btn--secondary">
          ← {tr('Dashboard', 'الداشبورد')}
        </Link>
      </header>

      {/* ── Add Form ── */}
      <Motion.div
        className="orders-surface"
        style={{ marginBottom: '20px' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
      >
        <div
          style={{
            fontSize: '10px',
            color: 'var(--accent)',
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            fontWeight: 800,
            marginBottom: '16px',
          }}
        >
          ✦ {tr('Add New Region', 'إضافة منطقة جديدة')}
        </div>

        <div className="orders-filters">
          <input
            className="orders-input"
            placeholder={tr('Governorate name', 'اسم المحافظة')}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <input
              className="orders-input"
              type="number"
              min="0"
              step="0.01"
              placeholder={tr('Shipping price', 'سعر الشحن')}
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              style={{ paddingRight: '42px', minWidth: '160px' }}
            />
            <span
              style={{
                position: 'absolute',
                right: '10px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
              }}
            >
              EGP
            </span>
          </div>
          <button
            className="orders-btn orders-btn--primary"
            onClick={() =>
              addMut.mutate({ name: form.name.trim(), price: Number(form.price || 0) })
            }
            disabled={!form.name.trim() || form.price === '' || addMut.isPending}
          >
            {addMut.isPending ? tr('Adding…', 'جارٍ الإضافة…') : tr('Add Region', 'إضافة منطقة')}
          </button>
        </div>

        {addMut.isError && (
          <div
            className="orders-feedback orders-feedback--error"
            role="alert"
            style={{ marginTop: '12px' }}
          >
            {tr('Failed to add region. Try again.', 'فشل إضافة المنطقة. حاول مجدداً.')}
          </div>
        )}
      </Motion.div>

      {/* ── Regions Table ── */}
      <Motion.div
        className="orders-surface"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: 'var(--accent)',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              fontWeight: 800,
            }}
          >
            ✦ {tr('All Regions', 'جميع المناطق')}
          </div>
          {!isLoading && !isError && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {regions.length} {tr('region(s)', regions.length === 1 ? 'منطقة' : 'مناطق')}
            </span>
          )}
        </div>

        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{tr('Governorate', 'المحافظة')}</th>
                <th>{tr('Shipping Price', 'سعر الشحن')}</th>
                <th>{tr('Actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(4)].map((__, j) => (
                        <td key={j}>
                          <Motion.div
                            className="orders-skeleton-row"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
                            style={{ height: '16px', borderRadius: '4px' }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : isError ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{ textAlign: 'center', padding: '32px', color: 'var(--danger)' }}
                  >
                    {tr('Failed to load regions.', 'فشل تحميل المناطق.')}{' '}
                    <button className="orders-btn" onClick={() => refetch()}>
                      {tr('Retry', 'إعادة المحاولة')}
                    </button>
                  </td>
                </tr>
              ) : regions.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.88rem',
                    }}
                  >
                    {tr(
                      'No shipping regions yet. Add one above.',
                      'لا توجد مناطق شحن بعد. أضف منطقة من الأعلى.'
                    )}
                  </td>
                </tr>
              ) : (
                regions.map((r, i) => (
                  <tr
                    key={r.id}
                    style={
                      editing === r.id
                        ? { background: 'rgba(216,210,194,0.04)' }
                        : undefined
                    }
                  >
                    {/* Index */}
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {i + 1}
                    </td>

                    {/* Name */}
                    <td>
                      {editing === r.id ? (
                        <input
                          className="orders-input"
                          value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          style={{ minWidth: '140px' }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {r.name}
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td>
                      {editing === r.id ? (
                        <div
                          style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <input
                            className="orders-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.price}
                            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                            style={{ paddingRight: '42px', minWidth: '120px' }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              right: '10px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'var(--text-secondary)',
                              pointerEvents: 'none',
                            }}
                          >
                            EGP
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {Number(r.price).toLocaleString()}{' '}
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 400,
                              color: 'var(--text-secondary)',
                            }}
                          >
                            EGP
                          </span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {editing === r.id ? (
                          <>
                            <button
                              className="orders-btn orders-btn--primary"
                              style={{ fontSize: '11px', padding: '6px 14px' }}
                              onClick={() =>
                                editMut.mutate({
                                  id: r.id,
                                  payload: {
                                    name: form.name.trim(),
                                    price: Number(form.price || 0),
                                  },
                                })
                              }
                              disabled={editMut.isPending}
                            >
                              {editMut.isPending
                                ? tr('Saving…', 'جارٍ الحفظ…')
                                : tr('Save', 'حفظ')}
                            </button>
                            <button
                              className="orders-btn orders-btn--secondary"
                              style={{ fontSize: '11px', padding: '6px 14px' }}
                              onClick={() => setEditing(null)}
                            >
                              {tr('Cancel', 'إلغاء')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="orders-btn orders-btn--secondary orders-btn--table"
                              onClick={() => {
                                setEditing(r.id);
                                setForm({ name: r.name, price: r.price });
                              }}
                            >
                              {tr('Edit', 'تعديل')}
                            </button>
                            <button
                              className="orders-btn orders-btn--table"
                              style={{
                                color: 'var(--danger)',
                                borderColor: 'rgba(239,68,68,0.25)',
                              }}
                              onClick={() => delMut.mutate(r.id)}
                              disabled={delMut.isPending && delMut.variables === r.id}
                            >
                              {tr('Delete', 'حذف')}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Motion.div>
    </section>
  );
}