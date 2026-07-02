import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import StatsCard from '../../components/dashboard/StatsCard';
import ProductTable from '../../components/products/ProductTable';
import ProductFormModal from '../../components/products/ProductFormModal';
import { getDashboardOverview } from '../../services/dashboardService';
import {
  createProduct,
  deleteProduct,
  getProductCategories,
  getProducts,
  updateProduct,
  uploadProductImage,
  createCategory,
  updateCategory,
  deleteCategory as removeCategory,
} from '../../services/productService';
import {
  adminGetUsers,
  adminUpdateUserRole,
  adminCreateUser,
  adminGetMarketers,
  adminCreateMarketer,
  adminUpdateMarketer,
  adminGetMarketerPrices,
  adminSetMarketerPrice,
  adminUpdateMarketerPrice,
  adminDeleteMarketerPrice,
} from '../../services/marketerService';
import './dashboard.css';

/* ─── Constants ──────────────────────────────────────────────── */
const USER_ROLES = [
  { value: 'admin',    label: 'Admin' },
  { value: 'staff',    label: 'Staff' },
  { value: 'customer', label: 'Customer' },
  { value: 'marketer', label: 'Marketer' },
];

/* ─── Helpers ────────────────────────────────────────────────── */
function StatsCardSkeleton() {
  return (
    <article className="stats-card stats-card--skeleton" aria-hidden="true">
      <div className="skeleton skeleton-icon" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-value" />
      <div className="skeleton skeleton-change" />
    </article>
  );
}

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
      style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '8px', ...style }}
    >
      {children}
    </div>
  );
}

function FeedbackBanner({ feedback, onClose }) {
  if (!feedback) return null;
  const isSuccess = feedback.type === 'success';
  return (
    <Motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      style={{
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '0.85rem',
        fontWeight: 600,
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isSuccess ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        color: isSuccess ? '#16a34a' : '#dc2626',
      }}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
      >
        ×
      </button>
    </Motion.div>
  );
}

function inputStyle(extra = {}) {
  return {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border, rgba(128,128,128,0.3))',
    background: 'var(--input-bg, var(--surface-2, rgba(128,128,128,0.1)))',
    color: 'var(--text-primary, inherit)',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    colorScheme: 'light dark',
    ...extra,
  };
}

const QUICK_LINKS = [
  { to: '/dashboard/orders',    label: 'Orders' },
  { to: '/dashboard/customers', label: 'Customers' },
  { to: '/dashboard/invoices',  label: 'Invoices' },
  { to: '/dashboard/shipping',  label: 'Shipping' },
  { to: '/dashboard/marketers', label: 'Marketers' },
];

/* ═══════════════════════════════════════════════════════════════
   Section: User Role Management
   ═══════════════════════════════════════════════════════════════ */
function UserRoleSection() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingRole, setEditingRole] = useState('');
  const [feedback, setFeedback] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminGetUsers({ page_size: 100 }),
  });

  const users = useMemo(() => {
    const list = Array.isArray(data) ? data : (data?.results ?? []);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const mutation = useMutation({
    mutationFn: ({ id, role }) => adminUpdateUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingId(null);
      setFeedback({ type: 'success', message: 'تم تحديث الدور بنجاح.' });
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || err?.message || 'حدث خطأ.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditingRole(user.role);
    setFeedback(null);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = () => {
    if (!editingId) return;
    mutation.mutate({ id: editingId, role: editingRole });
  };

  const roleBadge = (role) => {
    const colours = {
      admin:    { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
      staff:    { bg: 'rgba(59,130,246,0.1)',  color: '#2563eb' },
      marketer: { bg: 'rgba(234,179,8,0.1)',   color: '#ca8a04' },
      customer: { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
    };
    const s = colours[role] || { bg: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' };
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          background: s.bg,
          color: s.color,
        }}
      >
        {role}
      </span>
    );
  };

  return (
    <Motion.section
      className="products-management"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <header className="products-management__header">
        <div>
          <Eyebrow>المستخدمون</Eyebrow>
          <h2>إدارة أدوار المستخدمين</h2>
          <p>تعديل دور أي مستخدم — admin / staff / customer / marketer</p>
        </div>
        <input
          style={inputStyle({ maxWidth: '280px', width: '100%' })}
          placeholder="بحث بالإيميل أو الاسم…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </header>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <SectionCard>
        {isLoading && (
          <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            جارٍ التحميل…
          </div>
        )}
        {isError && (
          <div style={{ padding: '16px' }}>
            <div
              role="alert"
              style={{
                padding: '12px 14px',
                background: 'rgba(239,68,68,0.08)',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>تعذّر تحميل المستخدمين.</span>
              <button type="button" className="orders-btn orders-btn--secondary orders-btn--table" onClick={refetch}>
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}
        {!isLoading && !isError && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border, rgba(0,0,0,0.1))' }}>
                  {['المستخدم', 'الإيميل', 'الدور الحالي', 'إجراء'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        fontSize: '0.8rem',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '20px 14px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      لا يوجد مستخدمون.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))' }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      {u.first_name || u.last_name
                        ? `${u.first_name} ${u.last_name}`.trim()
                        : u.username || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {editingId === u.id ? (
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value)}
                          style={inputStyle({ width: '140px' })}
                        >
                          {USER_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        roleBadge(u.role)
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {editingId === u.id ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="orders-btn orders-btn--primary"
                            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                            onClick={saveEdit}
                            disabled={mutation.isPending}
                          >
                            {mutation.isPending ? 'جارٍ…' : 'حفظ'}
                          </button>
                          <button
                            type="button"
                            className="orders-btn orders-btn--secondary orders-btn--table"
                            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                            onClick={cancelEdit}
                            disabled={mutation.isPending}
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="categories-management__action"
                          onClick={() => startEdit(u)}
                        >
                          تعديل الدور
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </Motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Section: Add Marketer
   ═══════════════════════════════════════════════════════════════ */
function AddMarketerSection({ onMarketerAdded }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [feedback, setFeedback] = useState(null);

  // ── Existing user form ──
  const [existingUserId, setExistingUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // ── New user form ──
  const [newUser, setNewUser] = useState({
    email: '', username: '', first_name: '', last_name: '', password: '',
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminGetUsers({ page_size: 200 }),
  });

  const allUsers = useMemo(() => {
    const list = Array.isArray(usersData) ? usersData : (usersData?.results ?? []);
    // بس اليوزرز اللي مش عندهم marketer_profile بعد
    return list.filter((u) => u.role !== 'marketer' || !u.marketer_profile);
  }, [usersData]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(
      (u) => u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  const addExistingMutation = useMutation({
    mutationFn: () => adminCreateMarketer({ user_id: Number(existingUserId) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-marketers'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setExistingUserId('');
      setUserSearch('');
      setFeedback({ type: 'success', message: 'تمت إضافة المسوق بنجاح.' });
      onMarketerAdded?.();
    },
    onError: (err) => {
      const data = err?.response?.data;
      const msg = typeof data === 'object'
        ? Object.values(data).flat().join(' | ')
        : (err?.message || 'حدث خطأ.');
      setFeedback({ type: 'error', message: msg });
    },
  });

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      // 1. أنشئ اليوزر بدور marketer
      const createdUser = await adminCreateUser({ ...newUser, role: 'marketer' });
      // 2. أنشئ المسوق بناءً عليه
      return adminCreateMarketer({ user_id: createdUser.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-marketers'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setNewUser({ email: '', username: '', first_name: '', last_name: '', password: '' });
      setFeedback({ type: 'success', message: 'تم إنشاء المسوق الجديد بنجاح.' });
      onMarketerAdded?.();
    },
    onError: (err) => {
      const data = err?.response?.data;
      const msg = typeof data === 'object'
        ? Object.values(data).flat().join(' | ')
        : (err?.message || 'حدث خطأ.');
      setFeedback({ type: 'error', message: msg });
    },
  });

  const setField = (f) => (e) => setNewUser((p) => ({ ...p, [f]: e.target.value }));
  const isPending = addExistingMutation.isPending || createAndAddMutation.isPending;

  return (
    <Motion.section
      className="products-management"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <header className="products-management__header">
        <div>
          <Eyebrow>المسوقون</Eyebrow>
          <h2>إضافة مسوق جديد</h2>
          <p>ربط يوزر موجود بحساب مسوق، أو إنشاء يوزر ومسوق جديد من الصفر.</p>
        </div>
        {/* Toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['existing', 'new'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setFeedback(null); }}
              className={mode === m ? 'orders-btn orders-btn--primary' : 'orders-btn orders-btn--secondary orders-btn--table'}
              style={{ fontSize: '0.82rem', padding: '7px 14px' }}
            >
              {m === 'existing' ? 'يوزر موجود' : 'يوزر جديد'}
            </button>
          ))}
        </div>
      </header>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <SectionCard style={{ padding: '20px' }}>
        {mode === 'existing' ? (
          <div>
            <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              اختر يوزر موجود وحوّله لمسوق — الدور بتاعه هيتغير تلقائياً لـ marketer.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end', maxWidth: '480px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  بحث وتحديد يوزر
                </label>
                <input
                  style={inputStyle()}
                  placeholder="ابحث بالإيميل أو الاسم…"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setExistingUserId(''); }}
                />
                {userSearch && filteredUsers.length > 0 && !existingUserId && (
                  <div
                    style={{
                      border: '1px solid var(--border, rgba(128,128,128,0.3))',
                      borderRadius: '8px',
                      marginTop: '4px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      background: 'var(--surface-2, var(--surface-1, #1a1a1a))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                  >
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => { setExistingUserId(u.id); setUserSearch(u.email); }}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.06)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <strong>{u.email}</strong>
                        <span style={{ marginRight: '8px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          {u.first_name} {u.last_name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="orders-btn orders-btn--primary"
                onClick={() => addExistingMutation.mutate()}
                disabled={!existingUserId || isPending}
              >
                {isPending ? 'جارٍ…' : 'إضافة كمسوق'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              أنشئ يوزر جديد تلقائياً وسجّله كمسوق في خطوة واحدة.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: '560px' }}>
              {[
                { field: 'email',      label: 'الإيميل *',     type: 'email',    placeholder: 'example@mail.com' },
                { field: 'username',   label: 'اسم المستخدم *', type: 'text',     placeholder: 'username' },
                { field: 'first_name', label: 'الاسم الأول',   type: 'text',     placeholder: '' },
                { field: 'last_name',  label: 'الاسم الأخير',  type: 'text',     placeholder: '' },
                { field: 'password',   label: 'كلمة المرور *', type: 'password', placeholder: '' },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field} style={{ gridColumn: field === 'password' ? '1 / -1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    style={inputStyle()}
                    value={newUser[field]}
                    onChange={setField(field)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="orders-btn orders-btn--primary"
              style={{ marginTop: '16px' }}
              onClick={() => createAndAddMutation.mutate()}
              disabled={!newUser.email || !newUser.username || !newUser.password || isPending}
            >
              {isPending ? 'جارٍ الإنشاء…' : 'إنشاء مسوق جديد'}
            </button>
          </div>
        )}
      </SectionCard>
    </Motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Section: Manage Marketers (edit + product prices)
   ═══════════════════════════════════════════════════════════════ */
function ManageMarketersSection({ products }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedMarketer, setSelectedMarketer] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [priceFeedback, setPriceFeedback] = useState(null);
  const [editFeedback, setEditFeedback] = useState(null);

  // قائمة المسوقين
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-marketers'],
    queryFn: () => adminGetMarketers({ page_size: 200 }),
  });

  const marketers = useMemo(() => {
    const list = Array.isArray(data) ? data : (data?.results ?? []);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (m) =>
        m.user_email?.toLowerCase().includes(q) ||
        m.user_name?.toLowerCase().includes(q) ||
        m.referral_code?.toLowerCase().includes(q)
    );
  }, [data, search]);

  // أسعار المسوق المختار
  const { data: pricesData, refetch: refetchPrices } = useQuery({
    queryKey: ['admin-marketer-prices', selectedMarketer?.id],
    queryFn: () => adminGetMarketerPrices(selectedMarketer.id),
    enabled: !!selectedMarketer,
  });
  const prices = Array.isArray(pricesData) ? pricesData : (pricesData?.results ?? []);

  // تعديل بيانات المسوق
  const editMutation = useMutation({
    mutationFn: (payload) => adminUpdateMarketer(selectedMarketer.id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['admin-marketers'] });
      setSelectedMarketer(updated);
      setEditFeedback({ type: 'success', message: 'تم حفظ التعديلات.' });
    },
    onError: (err) => {
      const d = err?.response?.data;
      const msg = typeof d === 'object' ? Object.values(d).flat().join(' | ') : (err?.message || 'خطأ.');
      setEditFeedback({ type: 'error', message: msg });
    },
  });

  // إضافة / تعديل سعر منتج
  const [newPrice, setNewPrice] = useState({ product: '', price: '' });
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editingPriceVal, setEditingPriceVal] = useState('');

  const addPriceMutation = useMutation({
    mutationFn: () =>
      adminSetMarketerPrice(selectedMarketer.id, Number(newPrice.product), newPrice.price),
    onSuccess: () => {
      refetchPrices();
      setNewPrice({ product: '', price: '' });
      setPriceFeedback({ type: 'success', message: 'تمت إضافة السعر.' });
    },
    onError: (err) => {
      const d = err?.response?.data;
      const msg = typeof d === 'object' ? Object.values(d).flat().join(' | ') : (err?.message || 'خطأ.');
      setPriceFeedback({ type: 'error', message: msg });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ priceId, val }) =>
      adminUpdateMarketerPrice(selectedMarketer.id, priceId, val),
    onSuccess: () => {
      refetchPrices();
      setEditingPriceId(null);
      setPriceFeedback({ type: 'success', message: 'تم تحديث السعر.' });
    },
    onError: (err) => {
      const d = err?.response?.data;
      setPriceFeedback({ type: 'error', message: typeof d === 'object' ? Object.values(d).flat().join(' | ') : err?.message });
    },
  });

  const deletePriceMutation = useMutation({
    mutationFn: (priceId) => adminDeleteMarketerPrice(selectedMarketer.id, priceId),
    onSuccess: () => {
      refetchPrices();
      setPriceFeedback({ type: 'success', message: 'تم حذف السعر.' });
    },
  });

  const openMarketer = (m) => {
    setSelectedMarketer(m);
    setEditForm({
      status: m.status,
      role: m.role,
      monthly_completed_orders_count: m.monthly_completed_orders_count,
      monthly_profit_balance: m.monthly_profit_balance,
      lifetime_total_orders: m.lifetime_total_orders,
      lifetime_total_profit: m.lifetime_total_profit,
    });
    setEditFeedback(null);
    setPriceFeedback(null);
  };

  const setEF = (f) => (e) => setEditForm((p) => ({ ...p, [f]: e.target.value }));

  // assigned product ids to skip in dropdown
  const assignedProductIds = new Set(prices.map((p) => String(p.product)));

  return (
    <Motion.section
      className="products-management"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <header className="products-management__header">
        <div>
          <Eyebrow>المسوقون</Eyebrow>
          <h2>تعديل بيانات المسوقين</h2>
          <p>اضغط على أي مسوق لتعديل بياناته وأسعار المنتجات الخاصة به.</p>
        </div>
        <input
          style={inputStyle({ maxWidth: '260px', width: '100%' })}
          placeholder="بحث بالاسم أو الكود…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </header>

      {/* ── Marketers list ── */}
      <SectionCard>
        {isLoading && (
          <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            جارٍ التحميل…
          </div>
        )}
        {isError && (
          <div style={{ padding: '16px' }}>
            <button type="button" className="orders-btn orders-btn--secondary orders-btn--table" onClick={refetch}>
              إعادة المحاولة
            </button>
          </div>
        )}
        {!isLoading && !isError && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border, rgba(0,0,0,0.1))' }}>
                  {['المسوق', 'الكود', 'الدور', 'الحالة', 'الرصيد الشهري', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        fontSize: '0.8rem',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marketers.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px 14px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      لا يوجد مسوقون.
                    </td>
                  </tr>
                )}
                {marketers.map((m) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
                      background: selectedMarketer?.id === m.id ? 'rgba(59,130,246,0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      {m.user_name || m.user_email || `#${m.id}`}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <code
                        style={{
                          fontFamily: 'monospace',
                          background: 'rgba(0,0,0,0.06)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '0.82rem',
                        }}
                      >
                        {m.referral_code}
                      </code>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {m.role === 'team_leader' ? '⭐ Team Leader' : 'مسوق'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: m.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: m.status === 'active' ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {m.status === 'active' ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent)' }}>
                      {Number(m.monthly_profit_balance ?? 0).toFixed(2)} ج.م
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        type="button"
                        className={
                          selectedMarketer?.id === m.id
                            ? 'categories-management__action categories-management__action--danger'
                            : 'categories-management__action'
                        }
                        onClick={() =>
                          selectedMarketer?.id === m.id
                            ? setSelectedMarketer(null)
                            : openMarketer(m)
                        }
                      >
                        {selectedMarketer?.id === m.id ? 'إغلاق' : 'تعديل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Edit panel (inline below table) ── */}
      {selectedMarketer && (
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: '4px' }}
        >
          <SectionCard style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <Eyebrow>تعديل</Eyebrow>
              <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--text-primary)' }}>
                {selectedMarketer.user_name || selectedMarketer.user_email}
                <span
                  style={{
                    marginRight: '10px',
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    color: 'var(--accent)',
                    fontWeight: 400,
                  }}
                >
                  {selectedMarketer.referral_code}
                </span>
              </h3>
            </div>

            <FeedbackBanner feedback={editFeedback} onClose={() => setEditFeedback(null)} />

            {/* Edit fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  حالة الحساب
                </label>
                <select style={inputStyle()} value={editForm.status || ''} onChange={setEF('status')}>
                  <option value="active">نشط</option>
                  <option value="suspended">موقوف</option>
                </select>
              </div>

              {/* Role */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  دور المسوق
                </label>
                <select style={inputStyle()} value={editForm.role || ''} onChange={setEF('role')}>
                  <option value="marketer">Marketer</option>
                  <option value="team_leader">Team Leader</option>
                </select>
              </div>

              {/* Monthly balance */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  الرصيد الشهري (ج.م)
                </label>
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle()}
                  value={editForm.monthly_profit_balance ?? ''}
                  onChange={setEF('monthly_profit_balance')}
                />
              </div>

              {/* Monthly orders */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  أوردرات الشهر الحالي
                </label>
                <input
                  type="number"
                  min="0"
                  style={inputStyle()}
                  value={editForm.monthly_completed_orders_count ?? ''}
                  onChange={setEF('monthly_completed_orders_count')}
                />
              </div>

              {/* Lifetime orders */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  إجمالي الأوردرات (كل الوقت)
                </label>
                <input
                  type="number"
                  min="0"
                  style={inputStyle()}
                  value={editForm.lifetime_total_orders ?? ''}
                  onChange={setEF('lifetime_total_orders')}
                />
              </div>

              {/* Lifetime profit */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  إجمالي الأرباح (كل الوقت) (ج.م)
                </label>
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle()}
                  value={editForm.lifetime_total_profit ?? ''}
                  onChange={setEF('lifetime_total_profit')}
                />
              </div>
            </div>

            <button
              type="button"
              className="orders-btn orders-btn--primary"
              onClick={() => editMutation.mutate(editForm)}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
            </button>

            {/* ── Product Prices ── */}
            <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border, rgba(0,0,0,0.1))' }} />

            <div>
              <Eyebrow>أسعار المنتجات</Eyebrow>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                أسعار التكلفة لهذا المسوق
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                هذا هو السعر الذي سيشتري به المسوق من الشركة — ربحه = سعر بيعه للعميل − هذا السعر.
              </p>

              <FeedbackBanner feedback={priceFeedback} onClose={() => setPriceFeedback(null)} />

              {/* Add price row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 180px auto',
                  gap: '10px',
                  alignItems: 'end',
                  marginBottom: '16px',
                  maxWidth: '560px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    المنتج
                  </label>
                  <select
                    style={inputStyle()}
                    value={newPrice.product}
                    onChange={(e) => setNewPrice((p) => ({ ...p, product: e.target.value }))}
                  >
                    <option value="">— اختر منتج —</option>
                    {products
                      .filter((p) => !assignedProductIds.has(String(p.id)))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    السعر (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={inputStyle()}
                    value={newPrice.price}
                    onChange={(e) => setNewPrice((p) => ({ ...p, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <button
                  type="button"
                  className="orders-btn orders-btn--primary"
                  style={{ alignSelf: 'end' }}
                  onClick={() => addPriceMutation.mutate()}
                  disabled={!newPrice.product || !newPrice.price || addPriceMutation.isPending}
                >
                  {addPriceMutation.isPending ? '…' : 'إضافة'}
                </button>
              </div>

              {/* Existing prices */}
              {prices.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border, rgba(0,0,0,0.1))' }}>
                        {['المنتج', 'السعر المحدد (ج.م)', 'آخر تعديل', ''].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '8px 12px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: 'var(--text-secondary)',
                              fontSize: '0.78rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prices.map((pr) => (
                        <tr
                          key={pr.id}
                          style={{ borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))' }}
                        >
                          <td style={{ padding: '10px 12px' }}>{pr.product_name ?? `#${pr.product}`}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                            {editingPriceId === pr.id ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                style={inputStyle({ width: '120px' })}
                                value={editingPriceVal}
                                onChange={(e) => setEditingPriceVal(e.target.value)}
                              />
                            ) : (
                              `${Number(pr.assigned_price).toFixed(2)} ج.م`
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {pr.updated_at ? new Date(pr.updated_at).toLocaleDateString('ar-EG') : '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {editingPriceId === pr.id ? (
                                <>
                                  <button
                                    type="button"
                                    className="categories-management__action"
                                    onClick={() => updatePriceMutation.mutate({ priceId: pr.id, val: editingPriceVal })}
                                    disabled={updatePriceMutation.isPending}
                                  >
                                    حفظ
                                  </button>
                                  <button
                                    type="button"
                                    className="categories-management__panel-cancel"
                                    style={{ fontSize: '0.78rem' }}
                                    onClick={() => setEditingPriceId(null)}
                                  >
                                    إلغاء
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="categories-management__action"
                                    onClick={() => {
                                      setEditingPriceId(pr.id);
                                      setEditingPriceVal(pr.assigned_price);
                                    }}
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    type="button"
                                    className="categories-management__action categories-management__action--danger"
                                    onClick={() => {
                                      if (window.confirm('حذف هذا السعر؟')) {
                                        deletePriceMutation.mutate(pr.id);
                                      }
                                    }}
                                    disabled={deletePriceMutation.isPending}
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
                </div>
              )}

              {prices.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '8px 0' }}>
                  لم يتم تحديد أسعار لهذا المسوق بعد. أضف منتجًا من الأعلى.
                </p>
              )}
            </div>
          </SectionCard>
        </Motion.div>
      )}
    </Motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const { isAuthReady, isAuthenticated, user } = useAuthStore();
  const isAdmin = String(user?.role || '').trim().toLowerCase() === 'admin';
  const canFetch = isAuthReady && isAuthenticated && isAdmin;

  /* ── Queries ── */
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-dashboard-overview'],
    queryFn: getDashboardOverview,
    retry: 1,
    enabled: canFetch,
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: getProductCategories,
    retry: 1,
    enabled: canFetch,
  });

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsQueryError,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['admin-products'],
    queryFn: getProducts,
    retry: 1,
    enabled: canFetch,
  });

  /* ── Product modal state ── */
  const [feedback, setFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [activeProduct, setActiveProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Category state ── */
  const [categoryName, setCategoryName] = useState('');
  const [categoryImageFile, setCategoryImageFile] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryImageFile, setEditingCategoryImageFile] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  /* ── Product handlers ── */
  const openAddModal = () => { setModalMode('add'); setActiveProduct(null); setIsModalOpen(true); };
  const openEditModal = (product) => { setModalMode('edit'); setActiveProduct(product); setIsModalOpen(true); };
  const closeModal = () => { if (!isSubmitting) setIsModalOpen(false); };

  const handleSubmitProduct = async (payload) => {
    setIsSubmitting(true);
    try {
      const saved =
        modalMode === 'edit' && activeProduct
          ? await updateProduct(activeProduct.id, payload)
          : await createProduct(payload);
      if (payload.imageFiles?.length) await uploadProductImage(saved.id, payload.imageFiles);
      else if (payload.imageFile) await uploadProductImage(saved.id, payload.imageFile);
      await refetchProducts();
      setFeedback({
        type: 'success',
        message: modalMode === 'edit'
          ? tr('Product updated successfully.', 'تم تحديث المنتج بنجاح.')
          : tr('Product created successfully.', 'تم إنشاء المنتج بنجاح.'),
      });
      setIsModalOpen(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : tr('Unable to save product.', 'تعذّر حفظ المنتج.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`${tr('Delete', 'حذف')} ${product.name}?`)) return;
    await deleteProduct(product.id);
    await refetchProducts();
  };

  /* ── Category handlers ── */
  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;
    await createCategory({ name: categoryName.trim(), is_active: true, image: categoryImageFile || undefined });
    setCategoryName('');
    setCategoryImageFile(null);
    await refetchCategories();
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditingCategoryName(cat.name);
    setEditingCategoryImageFile(null);
    setDeletingCategory(null);
  };
  const cancelEditCategory = () => {
    if (isCategorySubmitting) return;
    setEditingCategory(null);
    setEditingCategoryName('');
    setEditingCategoryImageFile(null);
  };
  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategoryName.trim()) return;
    setIsCategorySubmitting(true);
    try {
      await updateCategory(editingCategory.id, {
        name: editingCategoryName.trim(),
        image: editingCategoryImageFile || undefined,
      });
      cancelEditCategory();
      await refetchCategories();
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const openDeleteCategory = (cat) => { setDeletingCategory(cat); setEditingCategory(null); };
  const cancelDeleteCategory = () => { if (isCategorySubmitting) return; setDeletingCategory(null); };
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsCategorySubmitting(true);
    try {
      await removeCategory(deletingCategory.id);
      setDeletingCategory(null);
      await refetchCategories();
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleMarketerAdded = useCallback(() => {}, []);

  return (
    <section className="admin-dashboard-overview">

      {/* ── Header ── */}
      <header className="admin-dashboard-overview__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Eyebrow>{tr('Admin', 'الإدارة')}</Eyebrow>
          <h1>{tr('Dashboard Overview', 'نظرة عامة')}</h1>
          <p>{tr('Live admin snapshot — sales, orders, customers, and catalog.', 'لقطة إدارية مباشرة — المبيعات والطلبات والعملاء والكتالوج.')}</p>
        </Motion.div>

        <Motion.nav
          className="admin-dashboard-overview__quick-links"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          aria-label={tr('Quick links', 'روابط سريعة')}
        >
          {QUICK_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="admin-dashboard-overview__orders-link">
              {link.label}
            </Link>
          ))}
        </Motion.nav>
      </header>

      {/* ── Stats grid ── */}
      {isLoading && (
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <Motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }}>
              <StatsCardSkeleton />
            </Motion.div>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="dashboard-error" role="alert">
          <p>{error instanceof Error ? error.message : tr('Something went wrong.', 'حدث خطأ ما.')}</p>
          <button type="button" onClick={() => refetch()}>
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {!isLoading && !isError && overview && (
        <Motion.div
          className="stats-grid"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {overview.stats.map((stat, i) => (
            <Motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.06 }}
            >
              <StatsCard
                title={stat.title}
                value={stat.value}
                change={stat.change}
                trend={stat.trend}
                icon={stat.key}
              />
            </Motion.div>
          ))}
        </Motion.div>
      )}

      {/* ── User Role Management ── */}
      {canFetch && <UserRoleSection />}

      {/* ── Add Marketer ── */}
      {canFetch && <AddMarketerSection onMarketerAdded={handleMarketerAdded} />}

      {/* ── Manage Marketers ── */}
      {canFetch && <ManageMarketersSection products={sortedProducts} />}

      {/* ── Categories management ── */}
      <Motion.section
        className="products-management"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <header className="products-management__header">
          <div>
            <Eyebrow>{tr('Catalog', 'الكتالوج')}</Eyebrow>
            <h2>{tr('Categories', 'الفئات')}</h2>
            <p>{tr('Create and manage product categories.', 'أنشئ فئات المنتجات وأدرها.')}</p>
          </div>
          <div className="categories-management__create">
            <input
              className="orders-input"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder={tr('Category name', 'اسم الفئة')}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <input
              type="file"
              accept="image/*"
              className="orders-input categories-management__file-input"
              onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="categories-management__panel-save"
              onClick={handleAddCategory}
              disabled={!categoryName.trim()}
            >
              {tr('Add', 'إضافة')}
            </button>
          </div>
        </header>

        <div className="orders-surface">
          {categoriesError && (
            <div className="dashboard-error" role="alert" style={{ marginBottom: '12px' }}>
              <p>{tr('Unable to load categories.', 'تعذّر تحميل الفئات.')}</p>
            </div>
          )}

          {(categories || []).map((cat) => (
            <div key={cat.id} className="categories-management__row">
              <span>{cat.name}</span>
              <div className="categories-management__actions">
                <button type="button" className="categories-management__action" onClick={() => openEditCategory(cat)}>
                  {tr('Edit', 'تعديل')}
                </button>
                <button
                  type="button"
                  className="categories-management__action categories-management__action--danger"
                  onClick={() => openDeleteCategory(cat)}
                >
                  {tr('Delete', 'حذف')}
                </button>
              </div>
            </div>
          ))}

          {editingCategory && (
            <Motion.article
              className="categories-management__panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              aria-live="polite"
            >
              <header>
                <h3>{tr('Edit Category', 'تعديل الفئة')}</h3>
                <p>{tr('Update the selected category.', 'حدّث الفئة المحددة.')}</p>
              </header>
              <div className="categories-management__panel-content">
                <input
                  className="orders-input"
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                  placeholder={tr('Category name', 'اسم الفئة')}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="orders-input"
                  onChange={(e) => setEditingCategoryImageFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="categories-management__panel-actions">
                <button
                  type="button"
                  className="categories-management__panel-cancel"
                  onClick={cancelEditCategory}
                  disabled={isCategorySubmitting}
                >
                  {tr('Cancel', 'إلغاء')}
                </button>
                <button
                  type="button"
                  className="categories-management__panel-save"
                  onClick={handleEditCategory}
                  disabled={isCategorySubmitting || !editingCategoryName.trim()}
                >
                  {isCategorySubmitting ? tr('Saving…', 'جارٍ الحفظ…') : tr('Save', 'حفظ')}
                </button>
              </div>
            </Motion.article>
          )}

          {deletingCategory && (
            <Motion.article
              className="categories-management__panel categories-management__panel--danger"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              aria-live="polite"
            >
              <header>
                <h3>{tr('Delete Category', 'حذف الفئة')}</h3>
                <p>
                  {tr('This will permanently delete', 'سيؤدي هذا إلى حذف')}{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{deletingCategory.name}</strong>.{' '}
                  {tr('This action cannot be undone.', 'لا يمكن التراجع عن هذا الإجراء.')}
                </p>
              </header>
              <div className="categories-management__panel-actions">
                <button
                  type="button"
                  className="categories-management__panel-cancel"
                  onClick={cancelDeleteCategory}
                  disabled={isCategorySubmitting}
                >
                  {tr('Keep', 'إبقاء')}
                </button>
                <button
                  type="button"
                  className="categories-management__action categories-management__action--danger"
                  onClick={handleDeleteCategory}
                  disabled={isCategorySubmitting}
                >
                  {isCategorySubmitting ? tr('Deleting…', 'جارٍ الحذف…') : tr('Delete', 'حذف')}
                </button>
              </div>
            </Motion.article>
          )}
        </div>
      </Motion.section>

      {/* ── Products management ── */}
      <Motion.section
        className="products-management"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <header className="products-management__header">
          <div>
            <Eyebrow>{tr('Catalog', 'الكتالوج')}</Eyebrow>
            <h2>{tr('Products', 'المنتجات')}</h2>
            <p>{tr('Manage items, stock, and pricing.', 'أدر العناصر والمخزون والتسعير.')}</p>
          </div>
          <button type="button" onClick={openAddModal}>
            + {tr('Add Product', 'إضافة منتج')}
          </button>
        </header>

        {feedback && (
          <Motion.div
            className={`products-feedback is-${feedback.type}`}
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {feedback.message}
          </Motion.div>
        )}

        {(productsQueryError || categoriesError) && (
          <div className="dashboard-error" role="alert" style={{ marginBottom: '14px' }}>
            <p>
              {productsError instanceof Error
                ? productsError.message
                : tr('Unable to load products.', 'تعذّر تحميل المنتجات.')}
            </p>
          </div>
        )}

        {!productsQueryError && (
          <ProductTable
            products={sortedProducts}
            loading={productsLoading}
            onAddProduct={openAddModal}
            onEditProduct={openEditModal}
            onDeleteProduct={handleDeleteProduct}
          />
        )}
      </Motion.section>

      {/* ── Product modal ── */}
      {isModalOpen && (
        <ProductFormModal
          key={`${modalMode}-${activeProduct?.id ?? 'new'}`}
          isOpen={isModalOpen}
          mode={modalMode}
          categories={categories}
          categoriesLoading={categoriesLoading}
          initialProduct={activeProduct}
          isSubmitting={isSubmitting}
          onClose={closeModal}
          onSubmit={handleSubmitProduct}
        />
      )}
    </section>
  );
}