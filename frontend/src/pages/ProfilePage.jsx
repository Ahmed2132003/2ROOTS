import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import './orders/orders.css';

/* ─── Profile Info ──────────────────────────────────────────────── */
function ProfileInfo({ profile }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  const fields = [
    { label: tr('Full Name', 'الاسم الكامل'), value: profile?.username },
    { label: tr('Email', 'البريد الإلكتروني'), value: profile?.email },
    { label: tr('Phone', 'رقم الهاتف'), value: profile?.phone },
    { label: tr('Address', 'العنوان'), value: profile?.address },
    { label: tr('Member Since', 'عضو منذ'), value: joinedDate },
  ];

  return (
    <article className="orders-card orders-stack">
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
          ✦ {tr('Account', 'الحساب')}
        </div>
        <h2 className="orders-section-title">{tr('Profile Info', 'معلوماتي')}</h2>
      </header>

      <div style={{ display: 'grid', gap: '0', borderTop: '1px solid var(--border)' }}>
        {fields.map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              {label}
            </span>
            <span
              style={{
                color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: value ? 500 : 400,
                textAlign: isRTL ? 'left' : 'right',
                wordBreak: 'break-word',
                maxWidth: '60%',
              }}
            >
              {value || '—'}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

/* ─── Edit Form ─────────────────────────────────────────────────── */
function EditProfileForm({ profile, onSaved }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const [form, setForm] = useState(() => ({
    username: profile?.username || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
  }));
  const [errors, setErrors] = useState({});

  const updateMutation = useMutation({
    mutationFn: (payload) => api.patch('/auth/profile/', payload),
    onSuccess: (res) => {
      onSaved(res.data);
      setForm({
        username: res.data?.username || '',
        phone: res.data?.phone || '',
        address: res.data?.address || '',
      });
      setErrors({ success: tr('Profile updated successfully.', 'تم تحديث الملف الشخصي.') });
    },
    onError: (error) => {
      const detail = error?.response?.data;
      if (detail && typeof detail === 'object') {
        const next = Object.entries(detail).reduce(
          (acc, [key, value]) => ({ ...acc, [key]: Array.isArray(value) ? value[0] : value }),
          {}
        );
        setErrors(next);
        return;
      }
      setErrors({ general: tr('Unable to update profile right now.', 'تعذّر تحديث الملف الشخصي.') });
    },
  });

  const validate = () => {
    const next = {};
    if (!form.username.trim())
      next.username = tr('Name is required.', 'الاسم مطلوب.');
    if (form.phone && !/^[+0-9\s()-]{7,20}$/.test(form.phone))
      next.phone = tr('Invalid phone format.', 'صيغة هاتف غير صالحة.');
    if (form.address.length > 400)
      next.address = tr('Address is too long.', 'العنوان طويل جداً.');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    updateMutation.mutate(form);
  };

  const currentProfile = {
    username: profile?.username || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
  };
  const isDirty =
    form.username !== currentProfile.username ||
    form.phone !== currentProfile.phone ||
    form.address !== currentProfile.address;

  const inputStyle = {
    width: '100%',
    height: '44px',
    borderRadius: '2px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    padding: '0 12px',
    outline: 0,
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
  };

  return (
    <form className="orders-card orders-stack" onSubmit={submit} noValidate>
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
          ✦ {tr('Edit', 'تعديل')}
        </div>
        <h2 className="orders-section-title">{tr('Edit Profile', 'تعديل الملف')}</h2>
      </header>

      {errors.general && (
        <div className="orders-feedback orders-feedback--error">{errors.general}</div>
      )}
      {errors.success && (
        <div className="orders-feedback orders-feedback--success">{errors.success}</div>
      )}

      {/* Full Name */}
      <label className="orders-field">
        <span>{tr('Full Name', 'الاسم الكامل')}</span>
        <input
          style={inputStyle}
          placeholder={tr('Your full name', 'اسمك الكامل')}
          value={form.username}
          onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
        />
        {errors.username && (
          <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.username}</p>
        )}
      </label>

      {/* Phone */}
      <label className="orders-field">
        <span>{tr('Phone', 'رقم الهاتف')}</span>
        <input
          style={inputStyle}
          placeholder="+20 1XX XXX XXXX"
          value={form.phone}
          onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
        />
        {errors.phone && (
          <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.phone}</p>
        )}
      </label>

      {/* Address */}
      <label className="orders-field">
        <span>{tr('Address', 'العنوان')}</span>
        <textarea
          className="orders-textarea"
          placeholder={tr('Street, City, Governorate', 'الشارع، المدينة، المحافظة')}
          value={form.address}
          onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
          style={{ minHeight: '88px' }}
        />
        {errors.address && (
          <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.address}</p>
        )}
      </label>

      <button
        type="submit"
        className="orders-btn orders-btn--primary"
        disabled={updateMutation.isPending || !isDirty}
      >
        {updateMutation.isPending
          ? tr('Saving…', 'جارٍ الحفظ…')
          : tr('Save Changes', 'حفظ التغييرات')}
      </button>
    </form>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const { setUser } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/auth/profile/')).data,
  });

  return (
    <section className="orders-page">
      {/* Header */}
      <header className="orders-page__header">
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
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
          <h1 className="orders-page__title">{tr('My Profile', 'ملفي الشخصي')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr('Manage your personal account information.', 'إدارة معلومات حسابك الشخصي.')}
          </p>
        </Motion.div>
      </header>

      {/* Loading */}
      {isLoading && (
        <div className="orders-skeleton">
          <div className="orders-skeleton-row" style={{ height: '240px' }} />
          <div className="orders-skeleton-row" style={{ height: '320px' }} />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="orders-error">
          <p>{error instanceof Error ? error.message : tr('Failed to load profile.', 'فشل تحميل الملف الشخصي.')}</p>
          <button className="orders-btn" onClick={() => refetch()}>
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <Motion.div
          className="orders-details-grid"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <ProfileInfo profile={data} />
          <EditProfileForm profile={data} onSaved={(user) => setUser(user)} />
        </Motion.div>
      )}
    </section>
  );
}