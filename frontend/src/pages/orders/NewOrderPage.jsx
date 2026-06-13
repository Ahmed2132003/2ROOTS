import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import { useCreateOrder } from '../../hooks/useOrders';
import './orders.css';

const INITIAL_FORM = {
  shipping_name: '',
  shipping_phone: '',
  shipping_email: '',
  shipping_address: '',
  variant_id: '',
  quantity: '1',
  tax: '0',
  shipping: '0',
  discount: '0',
  notes: '',
};

export default function NewOrderPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitError, setSubmitError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      await createOrder.mutateAsync({
        shipping_name: form.shipping_name.trim(),
        shipping_phone: form.shipping_phone.trim(),
        shipping_email: form.shipping_email.trim(),
        shipping_address: form.shipping_address.trim(),
        status: 'pending',
        notes: form.notes.trim(),
        tax: Number(form.tax || 0),
        shipping: Number(form.shipping || 0),
        discount: Number(form.discount || 0),
        items: [{ variant_id: Number(form.variant_id), quantity: Number(form.quantity || 1) }],
      });
      navigate('/dashboard/orders');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tr('Failed to create order.', 'فشل إنشاء الطلب.'));
    }
  };

  return (
    <section className="orders-page">

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
          <h1 className="orders-page__title">{tr('New Order', 'طلب جديد')}</h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr('Create a new sales order directly from the dashboard.', 'أنشئ طلب مبيعات جديداً من الداشبورد مباشرةً.')}
          </p>
        </Motion.div>

        <Link to="/dashboard/orders" className="orders-btn orders-btn--secondary">
          ← {tr('Cancel', 'إلغاء')}
        </Link>
      </header>

      {/* ── Form ── */}
      <Motion.form
        className="orders-surface orders-form"
        onSubmit={handleSubmit}
        noValidate
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {/* Error */}
        {submitError && (
          <div className="orders-feedback orders-feedback--error" role="alert">
            {submitError}
          </div>
        )}

        {/* ── Section: Customer ── */}
        <div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--accent)',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              fontWeight: 800,
              marginBottom: '14px',
            }}
          >
            ✦ {tr('Customer', 'العميل')}
          </div>
          <div className="orders-form-grid">
            <label className="orders-field">
              <span>{tr('Customer Name', 'اسم العميل')}</span>
              <input
                className="orders-input"
                name="shipping_name"
                value={form.shipping_name}
                onChange={handleChange}
                placeholder={tr('Full name', 'الاسم الكامل')}
                required
              />
            </label>

            <label className="orders-field">
              <span>{tr('Phone', 'الهاتف')}</span>
              <input
                className="orders-input"
                name="shipping_phone"
                value={form.shipping_phone}
                onChange={handleChange}
                placeholder="+20 1XX XXX XXXX"
              />
            </label>

            <label className="orders-field">
              <span>{tr('Email', 'البريد الإلكتروني')}</span>
              <input
                className="orders-input"
                name="shipping_email"
                type="email"
                value={form.shipping_email}
                onChange={handleChange}
                placeholder="customer@email.com"
                required
              />
            </label>

            <label className="orders-field orders-field--full">
              <span>{tr('Shipping Address', 'عنوان الشحن')}</span>
              <input
                className="orders-input"
                name="shipping_address"
                value={form.shipping_address}
                onChange={handleChange}
                placeholder={tr('Street, City, Governorate', 'الشارع، المدينة، المحافظة')}
              />
            </label>
          </div>
        </div>

        {/* ── Section: Product ── */}
        <div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--accent)',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              fontWeight: 800,
              marginBottom: '14px',
            }}
          >
            ✦ {tr('Product', 'المنتج')}
          </div>
          <div className="orders-form-grid">
            <label className="orders-field">
              <span>{tr('Variant ID', 'معرّف المتغير')}</span>
              <input
                className="orders-input"
                name="variant_id"
                type="number"
                min="1"
                value={form.variant_id}
                onChange={handleChange}
                placeholder="e.g. 42"
                required
              />
            </label>

            <label className="orders-field">
              <span>{tr('Quantity', 'الكمية')}</span>
              <input
                className="orders-input"
                name="quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={handleChange}
                required
              />
            </label>
          </div>
        </div>

        {/* ── Section: Pricing ── */}
        <div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--accent)',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              fontWeight: 800,
              marginBottom: '14px',
            }}
          >
            ✦ {tr('Pricing', 'التسعير')}
          </div>
          <div className="orders-form-grid">
            <label className="orders-field">
              <span>{tr('Tax (EGP)', 'الضريبة (ج.م)')}</span>
              <input
                className="orders-input"
                name="tax"
                type="number"
                min="0"
                step="0.01"
                value={form.tax}
                onChange={handleChange}
              />
            </label>

            <label className="orders-field">
              <span>{tr('Shipping (EGP)', 'الشحن (ج.م)')}</span>
              <input
                className="orders-input"
                name="shipping"
                type="number"
                min="0"
                step="0.01"
                value={form.shipping}
                onChange={handleChange}
              />
            </label>

            <label className="orders-field">
              <span>{tr('Discount (EGP)', 'الخصم (ج.م)')}</span>
              <input
                className="orders-input"
                name="discount"
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={handleChange}
              />
            </label>
          </div>
        </div>

        {/* ── Notes ── */}
        <label className="orders-field">
          <span>✦ {tr('Internal Notes', 'ملاحظات داخلية')}</span>
          <textarea
            className="orders-textarea"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            placeholder={tr('Optional admin note…', 'ملاحظة إدارية اختيارية…')}
          />
        </label>

        {/* ── Actions ── */}
        <div className="orders-form-actions">
          <button
            type="submit"
            className="orders-btn orders-btn--primary"
            disabled={createOrder.isPending}
          >
            {createOrder.isPending
              ? tr('Creating…', 'جارٍ الإنشاء…')
              : tr('Create Order', 'إنشاء الطلب')}
          </button>
          <Link to="/dashboard/orders" className="orders-btn orders-btn--secondary">
            {tr('Cancel', 'إلغاء')}
          </Link>
        </div>
      </Motion.form>
    </section>
  );
}