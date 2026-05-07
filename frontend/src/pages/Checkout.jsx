import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/api';

const initialForm = {
  shipping_name: '',
  shipping_phone: '',
  shipping_email: '',
  shipping_address: '',
  notes: '',
};

function CheckoutSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: '24px',
      }}
    >
      {[...Array(2)].map((_, i) => (
        <Motion.div
          key={i}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
          style={{
            minHeight: i === 0 ? '420px' : '320px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
          }}
        />
      ))}
    </div>
  );
}

function OrderConfirmation({ order, isRTL }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        maxWidth: '780px',
        margin: '0 auto',
        padding: '36px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '56px', marginBottom: '12px' }}>✅</div>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '10px', fontWeight: 800 }}>
        {isRTL ? 'تم تأكيد طلبك بنجاح' : 'Order confirmed successfully'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '26px' }}>
        {isRTL
          ? `رقم الطلب: #${order.id}. هنتواصل معاك قريب لتأكيد التنفيذ.`
          : `Your order number is #${order.id}. Our team will contact you soon.`}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {[
          {
            label: isRTL ? 'الحالة' : 'Status',
            value: order.status,
          },
          {
            label: isRTL ? 'الإجمالي' : 'Total',
            value: `${Number(order.total).toLocaleString()} EGP`,
          },
          {
            label: isRTL ? 'الاسم' : 'Shipping Name',
            value: order.shipping_name,
          },
          {
            label: isRTL ? 'رقم الهاتف' : 'Phone',
            value: order.shipping_phone,
          },
          {
            label: isRTL ? 'البريد الإلكتروني' : 'Email',
            value: order.shipping_email || '-',
          },
        ].map((line) => (
          <div
            key={line.label}
            style={{
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '12px',
              background: 'var(--bg-primary)',
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>{line.label}</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{line.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <Link to={`/track/${order.id}`} style={{ textDecoration: 'none' }}>
          <button
            style={{
              padding: '12px 18px',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {isRTL ? 'تتبع الطلب' : 'Track order'}
          </button>
        </Link>

        <Link to="/products" style={{ textDecoration: 'none' }}>
          <button
            style={{
              padding: '12px 18px',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontWeight: 700,
            }}
          >
            {isRTL ? 'متابعة التسوق' : 'Continue shopping'}
          </button>
        </Link>
      </div>
    </Motion.div>
  );
}

export default function Checkout() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart/').then((res) => res.data),
  });

  const items = cart?.items || [];
  const subtotal = Number(cart?.total_price || 0);
  const [selectedRegionId, setSelectedRegionId] = useState(() => localStorage.getItem('selected_shipping_region') || '');  
  const { data: regionsData } = useQuery({
    queryKey: ['shipping-regions'],
    queryFn: () => api.get('/orders/shipping-regions/').then((res) => res.data),
  });
  const regions = Array.isArray(regionsData)
    ? regionsData
    : Array.isArray(regionsData?.results)
      ? regionsData.results
      : [];

  useEffect(() => {
    localStorage.setItem('selected_shipping_region', selectedRegionId);
  }, [selectedRegionId]);

  
  const selectedRegion = regions.find((r) => String(r.id) === String(selectedRegionId));
  const shipping = selectedRegion ? Number(selectedRegion.price) : 0;  
  const grandTotal = subtotal + shipping;

  const hasUnavailableItems = items.some((item) => !item.is_available);

  const createOrder = useMutation({
    mutationFn: (payload) => api.post('/orders/', payload),
    onSuccess: (res) => {
      setConfirmedOrder(res.data);
      setForm(initialForm);
      setFormError('');
    },
    onError: (error) => {
      const detail = error?.response?.data?.detail;
      const unavailableItems = error?.response?.data?.unavailable_items;
      setFormError(
        detail ||
          (Array.isArray(unavailableItems) && unavailableItems.length
            ? unavailableItems.join(' | ')
            : isRTL
              ? 'تعذر تأكيد الطلب. راجع البيانات وحاول مرة أخرى.'
              : 'Unable to confirm order. Please review your data and try again.')
      );
    },
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.shipping_name.trim() || !form.shipping_phone.trim() || !form.shipping_email.trim() || !form.shipping_address.trim() || !selectedRegionId) {               
      setFormError(
        isRTL
          ? 'الاسم ورقم الهاتف والإيميل والعنوان مطلوبين قبل تأكيد الطلب.'
          : 'Name, phone, email and address are required before confirming order.'          
      );
      return;
    }

    createOrder.mutate({ ...form, shipping_region_id: Number(selectedRegionId) });    
  };

  if (confirmedOrder) {
    return (
      <div style={{ minHeight: '100vh', padding: '40px 5%' }}>
        <OrderConfirmation order={confirmedOrder} isRTL={isRTL} />
      </div>
    );
  }

  return (

    <div style={{ minHeight: '100vh', padding: '40px 5%' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--accent)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: 800,
              marginBottom: '8px',
            }}
          >
            ✦ {isRTL ? 'المرحلة 4' : 'Phase 4'}
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: '8px' }}>
            {isRTL ? 'Checkout & Confirm Order' : 'Checkout & Confirm Order'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isRTL
              ? 'راجع العناصر في السلة، اكتب بيانات الشحن، ثم أكد الطلب بدون بوابة دفع.'
              : 'Review your cart, fill in shipping details, then confirm the order (cash/order confirmation flow).'}
          </p>
        </div>

        {isLoading ? (
          <CheckoutSkeleton />
        ) : items.length === 0 ? (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '20px',
              background: 'var(--bg-card)',
              padding: '28px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--text-primary)', marginBottom: '14px' }}>
              {isRTL ? 'السلة فارغة حالياً. أضف منتجات أولاً.' : 'Your cart is empty. Add products first.'}
            </p>
            <Link to="/products">{isRTL ? 'اذهب للمنتجات' : 'Go to products'}</Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1fr) minmax(280px, 420px)',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            <form
              onSubmit={handleSubmit}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <h2 style={{ color: 'var(--text-primary)', fontWeight: 800, marginBottom: '8px' }}>
                {isRTL ? 'بيانات الشحن' : 'Shipping details'}
              </h2>

              {[
                { key: 'shipping_name', labelAr: 'الاسم بالكامل', labelEn: 'Full name' },
                { key: 'shipping_phone', labelAr: 'رقم الهاتف', labelEn: 'Phone number' },
                { key: 'shipping_email', labelAr: 'البريد الإلكتروني', labelEn: 'Email address' },
              ].map((input) => (
                <label key={input.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {isRTL ? input.labelAr : input.labelEn}
                  </span>
                  <input
                    type={input.key === 'shipping_email' ? 'email' : 'text'}
                    value={form[input.key]}
                    onChange={handleChange(input.key)}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '12px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </label>
              ))}

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {isRTL ? 'العنوان بالتفصيل' : 'Full address'}
                </span>
                <textarea
                  value={form.shipping_address}
                  onChange={handleChange('shipping_address')}
                  rows={4}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {isRTL ? 'المحافظة' : 'Governorate'}
                </span>
                <select
                  value={selectedRegionId || ''}
                  onChange={(event) => setSelectedRegionId(event.target.value)}
                  required
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">{isRTL ? 'اختر المحافظة' : 'Select Governorate'}</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                </span>
                <textarea
                  value={form.notes}
                  onChange={handleChange('notes')}
                  rows={3}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                  }}
                />
              </label>

              {regionsData && regions.length === 0 && (
                <div
                  style={{
                    borderRadius: '12px',
                    padding: '10px 12px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: 'var(--danger)',
                    fontSize: '13px',
                  }}
                >
                  {isRTL ? 'تعذر تحميل المحافظات.' : 'Failed to load governorates.'}
                </div>
              )}
              
              {formError && (
                <div
                  style={{
                    borderRadius: '12px',
                    padding: '10px 12px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: 'var(--danger)',
                    fontSize: '13px',
                  }}
                >
                  {formError}
                </div>
              )}

              {hasUnavailableItems && (
                <div
                  style={{
                    borderRadius: '12px',
                    padding: '10px 12px',
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.4)',
                    color: '#f59e0b',
                    fontSize: '13px',
                  }}
                >
                  {isRTL
                    ? 'في عناصر غير متاحة. راجع السلة قبل تأكيد الطلب.'
                    : 'Some items are unavailable. Please review the cart before confirming.'}
                </div>
              )}

              <button
                type="submit"
                disabled={createOrder.isPending || hasUnavailableItems}
                style={{
                  marginTop: '6px',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  cursor: hasUnavailableItems ? 'not-allowed' : 'pointer',
                  opacity: hasUnavailableItems ? 0.6 : 1,
                  background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              >
                {createOrder.isPending
                  ? isRTL
                    ? 'جاري التأكيد...'
                    : 'Confirming...'
                  : isRTL
                    ? 'تأكيد الطلب الآن'
                    : 'Confirm order now'}
              </button>
            </form>

            <aside
              style={{
                position: 'sticky',
                top: '96px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '24px',
              }}
            >
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontWeight: 800 }}>
                {isRTL ? 'مراجعة الطلب' : 'Order review'}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                    }}
                  >
                    <span>
                      {item.variant?.product?.name} × {item.quantity}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                      {Number(item.subtotal).toLocaleString()} EGP
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{subtotal.toLocaleString()} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الشحن' : 'Shipping'}</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {shipping === 0 ? (isRTL ? 'مجاني 🎉' : 'Free 🎉') : `${shipping} EGP`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{isRTL ? 'الإجمالي' : 'Total'}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{grandTotal.toLocaleString()} EGP</span>
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', marginTop: '14px', fontSize: '12px', lineHeight: 1.6 }}>
                {isRTL
                  ? 'هذا التدفق بدون دفع أونلاين في المرحلة الحالية. بمجرد التأكيد سيتم إنشاء الطلب وحجز المخزون.'
                  : 'This flow does not include online payment in this phase. Confirming will create the order and reserve stock.'}
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>

  )
}
