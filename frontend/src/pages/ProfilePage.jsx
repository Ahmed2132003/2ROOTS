import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import './orders/orders.css';

function ProfileInfo({ profile }) {
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : '—';

  return (
    <article className="orders-card">
      <h2 className="orders-page__title" style={{ fontSize: '1.2rem' }}>Profile Information</h2>
      <div className="orders-stack" style={{ marginTop: 12 }}>
        <p><strong>Full Name:</strong> {profile?.username || '—'}</p>
        <p><strong>Email:</strong> {profile?.email || '—'}</p>
        <p><strong>Phone:</strong> {profile?.phone || '—'}</p>
        <p><strong>Address:</strong> {profile?.address || '—'}</p>
        <p><strong>Member Since:</strong> {joinedDate}</p>
      </div>
    </article>
  );
}

function EditProfileForm({ profile, onSaved }) {
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
      setErrors({ success: 'Profile updated successfully.' });
    },
    onError: (error) => {
      const detail = error?.response?.data;
      if (detail && typeof detail === 'object') {
        const next = Object.entries(detail).reduce((acc, [key, value]) => ({ ...acc, [key]: Array.isArray(value) ? value[0] : value }), {});
        setErrors(next);
        return;
      }
      setErrors({ general: 'Unable to update profile right now.' });
    },
  });

  const validate = () => {
    const next = {};
    if (!form.username.trim()) next.username = 'Name is required.';
    if (form.phone && !/^[+0-9\s()-]{7,20}$/.test(form.phone)) next.phone = 'Invalid phone format.';
    if (form.address.length > 400) next.address = 'Address is too long.';
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

  return (
    <form className="orders-card orders-stack" onSubmit={submit}>
      <h2 className="orders-page__title" style={{ fontSize: '1.2rem' }}>Edit Profile</h2>
      {errors.general && <div className="orders-error"><p>{errors.general}</p></div>}
      {errors.success && <div className="orders-refresh">{errors.success}</div>}
      <div>
        <input className="orders-input" placeholder="Full Name" value={form.username} onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))} />
        {errors.username && <p className="orders-muted">{errors.username}</p>}
      </div>
      <div>
        <input className="orders-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
        {errors.phone && <p className="orders-muted">{errors.phone}</p>}
      </div>
      <div>
        <textarea className="orders-input" style={{ minHeight: 88, paddingTop: 12 }} placeholder="Address" value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} />
        {errors.address && <p className="orders-muted">{errors.address}</p>}
      </div>
      <button type="submit" className="orders-btn orders-btn--primary" disabled={updateMutation.isPending || !isDirty}>
        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const { setUser } = useAuthStore();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/auth/profile/')).data,
  });

  return (
    <section className="orders-page">
      <header className="orders-page__header">
        <div>
          <h1 className="orders-page__title">My Profile</h1>
          <p className="orders-page__subtitle">Manage your personal account information.</p>
        </div>
      </header>

      {isLoading && <div className="orders-skeleton"><div className="orders-skeleton-row" /><div className="orders-skeleton-row" /></div>}
      {isError && <div className="orders-error"><p>{error instanceof Error ? error.message : 'Failed to load profile.'}</p><button className="orders-btn" onClick={() => refetch()}>Retry</button></div>}

      {!isLoading && !isError && (
        <div className="orders-details-grid">
          <ProfileInfo profile={data} />
          <EditProfileForm profile={data} onSaved={(user) => setUser(user)} />
        </div>
      )}
    </section>
  );
}