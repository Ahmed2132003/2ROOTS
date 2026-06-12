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
            borderRadius: '4px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
          }}
        />
      ))}
    </div>
  );
}

function OrderConfirmation({ order, isRTL }) {
  const [trackHover, setTrackHover] = useState(false);
  const [continueHover, setContinueHover] = useState(false);

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        maxWidth: '780px',
        margin: '0 auto',
        padding: '36px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--accent)' }}>✓</div>
      <h1
        style={{
          color: 'var(--text-primary)',
          marginBottom: '10px',
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontSize: 'clamp(28px, 4vw, 38px)',
        }}
      >
        {isRTL ? 'تم تأكيد طلبك بنجاح' : 'Order Confirmed'}
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
            key: 'status',
            label: isRTL ? 'الحالة' : 'Status',
            value: order.status,
          },
          {
            key: 'total',
            label: isRTL ? 'الإجمالي' : 'Total',
            value: `${Number(order.total).toLocaleString()} EGP`,
          },
          {
            key: 'shipping_name',
            label: isRTL ? 'الاسم' : 'Shipping Name',
            value: order.shipping_name,
          },
          {
            key: 'phone',
            label: isRTL ? 'رقم الهاتف' : 'Phone',
            value: order.shipping_phone,
          },
          {
            key: 'email',
            label: isRTL ? 'البريد الإلكتروني' : 'Email',
            value: order.shipping_email || '-',
          },
        ].map((line) => (
          <div
            key={line.label}
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '12px',
              background: 'var(--bg-primary)',
            }}
          >
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '11px',
                marginBottom: '6px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {line.label}
            </div>
            <div
              style={{
                color: 'var(--text-primary)',
                fontWeight: 600,
                ...(line.key === 'email'
                  ? {
                      overflowWrap: 'break-word',
                      wordBreak: 'break-all',
                    }
                  : {}),
              }}
            >
              {line.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <Link to={`/track/${order.id}`} style={{ textDecoration: 'none' }}>
          <button
            onMouseEnter={() => setTrackHover(true)}
            onMouseLeave={() => setTrackHover(false)}
            style={{
              padding: '13px 24px',
              border: '1px solid #FFFFFF',
              borderRadius: '2px',
              cursor: 'pointer',
              background: trackHover ? 'var(--gold)' : '#FFFFFF',
              borderColor: trackHover ? 'var(--gold)' : '#FFFFFF',
              color: '#0A0A0A',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              transition: 'all 0.25s ease',
            }}
          >
            {isRTL ? 'تتبع الطلب' : 'Track Order'}
          </button>
        </Link>

        <Link to="/products" style={{ textDecoration: 'none' }}>
          <button
            onMouseEnter={() => setContinueHover(true)}
            onMouseLeave={() => setContinueHover(false)}
            style={{
              padding: '13px 24px',
              border: `1px solid ${continueHover ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: '2px',
              cursor: 'pointer',
              background: 'transparent',
              color: continueHover ? 'var(--gold)' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              transition: 'all 0.25s ease',
            }}
          >
            {isRTL ? 'متابعة التسوق' : 'Continue Shopping'}
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
  const [submitHover, setSubmitHover] = useState(false);

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
      <div style={{ minHeight: '100vh', padding: '40px 5%', background: 'var(--bg-primary)' }}>
        <OrderConfirmation order={confirmedOrder} isRTL={isRTL} />
      </div>
    );
  }

  const inputStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '2px',
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
  };

  const labelStyle = {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  };

  return (

    <div style={{ minHeight: '100vh', padding: '40px 5%', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--accent)',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: '10px',
            }}
          >
            ✦ {isRTL ? 'المرحلة 4' : 'Phase 4'}
          </div>
          <h1
            style={{
              color: 'var(--text-primary)',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(32px, 5vw, 48px)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Checkout & Confirm Order
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
              borderRadius: '4px',
              background: 'var(--bg-card)',
              padding: '40px 28px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
              {isRTL ? 'السلة فارغة حالياً. أضف منتجات أولاً.' : 'Your cart is empty. Add products first.'}
            </p>
            <Link
              to="/products"
              style={{
                color: 'var(--accent)',
                textDecoration: 'none',
                fontSize: '13px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                borderBottom: '1px solid var(--accent)',
                paddingBottom: '4px',
              }}
            >
              {isRTL ? 'اذهب للمنتجات' : 'Go to Products'}
            </Link>
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
                borderRadius: '4px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <h2
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontSize: '22px',
                  marginBottom: '4px',
                }}
              >
                {isRTL ? 'بيانات الشحن' : 'Shipping Details'}
              </h2>

              {[
                { key: 'shipping_name', labelAr: 'الاسم بالكامل', labelEn: 'Full name' },
                { key: 'shipping_phone', labelAr: 'رقم الهاتف', labelEn: 'Phone number' },
                { key: 'shipping_email', labelAr: 'البريد الإلكتروني', labelEn: 'Email address' },
              ].map((input) => (
                <label key={input.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={labelStyle}>
                    {isRTL ? input.labelAr : input.labelEn}
                  </span>
                  <input
                    type={input.key === 'shipping_email' ? 'email' : 'text'}
                    value={form[input.key]}
                    onChange={handleChange(input.key)}
                    style={inputStyle}
                  />
                </label>
              ))}

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={labelStyle}>
                  {isRTL ? 'العنوان بالتفصيل' : 'Full address'}
                </span>
                <textarea
                  value={form.shipping_address}
                  onChange={handleChange('shipping_address')}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={labelStyle}>
                  {isRTL ? 'المحافظة' : 'Governorate'}
                </span>
                <select
                  value={selectedRegionId || ''}
                  onChange={(event) => setSelectedRegionId(event.target.value)}
                  required
                  style={inputStyle}
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
                <span style={labelStyle}>
                  {isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                </span>
                <textarea
                  value={form.notes}
                  onChange={handleChange('notes')}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              {regionsData && regions.length === 0 && (
                <div
                  style={{
                    borderRadius: '2px',
                    padding: '12px 14px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.35)',
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
                    borderRadius: '2px',
                    padding: '12px 14px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.35)',
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
                    borderRadius: '2px',
                    padding: '12px 14px',
                    background: 'rgba(184,155,94,0.08)',
                    border: '1px solid rgba(184,155,94,0.4)',
                    color: 'var(--gold)',
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
                onMouseEnter={() => setSubmitHover(true)}
                onMouseLeave={() => setSubmitHover(false)}
                style={{
                  marginTop: '8px',
                  border: '1px solid #FFFFFF',
                  borderRadius: '2px',
                  padding: '15px',
                  cursor: hasUnavailableItems ? 'not-allowed' : 'pointer',
                  opacity: hasUnavailableItems ? 0.5 : 1,
                  background: submitHover && !hasUnavailableItems ? 'var(--gold)' : '#FFFFFF',
                  borderColor: submitHover && !hasUnavailableItems ? 'var(--gold)' : '#FFFFFF',
                  color: '#0A0A0A',
                  fontWeight: 700,
                  fontSize: '13px',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  transition: 'all 0.25s ease',
                }}
              >
                {createOrder.isPending
                  ? isRTL
                    ? 'جاري التأكيد...'
                    : 'Confirming...'
                  : isRTL
                    ? 'تأكيد الطلب الآن'
                    : 'Confirm Order'}
              </button>
            </form>

            <aside
              style={{
                position: 'sticky',
                top: '96px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '28px',
              }}
            >
              <h2
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontSize: '22px',
                  marginBottom: '18px',
                }}
              >
                {isRTL ? 'مراجعة الطلب' : 'Order Review'}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
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
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {Number(item.subtotal).toLocaleString()} EGP
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{subtotal.toLocaleString()} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{isRTL ? 'الشحن' : 'Shipping'}</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {shipping === 0 ? (isRTL ? 'مجاني' : 'Free') : `${shipping} EGP`}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '6px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontFamily: "'Bebas Neue', sans-serif",
                      letterSpacing: '1px',
                      fontSize: '18px',
                    }}
                  >
                    {isRTL ? 'الإجمالي' : 'Total'}
                  </span>
                  <span
                    style={{
                      color: 'var(--accent)',
                      fontWeight: 700,
                      fontFamily: "'Bebas Neue', sans-serif",
                      letterSpacing: '1px',
                      fontSize: '18px',
                    }}
                  >
                    {grandTotal.toLocaleString()} EGP
                  </span>
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '12px', lineHeight: 1.6 }}>
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