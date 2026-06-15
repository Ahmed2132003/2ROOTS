import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/* ─── Design Tokens ────────────────────────────────────────────────────────── */
const T = {
  bg:          '#0A0A0A',
  bgCard:      '#111111',
  bgHover:     '#1A1A1A',
  border:      'rgba(216,210,194,0.12)',
  borderHover: 'rgba(216,210,194,0.28)',
  textPrimary: '#FFFFFF',
  textSecond:  '#D9D9D9',
  textMuted:   'rgba(217,217,217,0.4)',
  stone:       '#D8D2C2',
  gold:        '#B89B5E',
  goldGlow:    'rgba(184,155,94,0.10)',
  green:       '#2F4F3E',
  danger:      '#B91C1C',
  dangerBg:    'rgba(185,28,28,0.08)',
  success:     '#15803D',
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const FALLBACK_CART_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Crect width='240' height='240' fill='%230A0A0A'/%3E%3Ctext x='50%25' y='50%25' fill='%23D8D2C2' font-size='18' text-anchor='middle' dominant-baseline='middle' font-family='Arial,sans-serif' letter-spacing='3'%3ENO IMAGE%3C/text%3E%3C/svg%3E";

// الباك شغال على 8081 دايماً
const BACKEND_ORIGIN = import.meta.env.DJANGO_BASE_URL?.trim() || 'http://localhost:8081';

function resolveCartImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return FALLBACK_CART_IMAGE;
  const url = rawUrl.trim();
  if (!url) return FALLBACK_CART_IMAGE;
  // URL كاملة — رجّعها زي ما هي
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  // مسار نسبي يبدأ بـ /
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`;
  // مسار بدون /
  return `${BACKEND_ORIGIN}/media/${url.replace(/^\/+/, '')}`;
}

function normalizeShippingRegions(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/* ─── Motion Variants ────────────────────────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] },
  }),
};

/* ══════════════════════════════════════════════════════════════════════════════
   CART ITEM ROW
══════════════════════════════════════════════════════════════════════════════ */
function CartItemRow({ item, index, t, isRTL, onUpdate, onRemove }) {
  const [qty,        setQty]        = useState(item.quantity);
  const [removing,   setRemoving]   = useState(false);
  const [imageError, setImageError] = useState(false);

  const productImage = item.variant?.product?.main_image || item.variant?.product?.image || item.image || '';
  const variantLabel = [item.variant?.color?.name, item.variant?.size?.name].filter(Boolean).join(' / ') || item.variant?.name;
  const imageSrc     = imageError ? FALLBACK_CART_IMAGE : resolveCartImageUrl(productImage);

  const handleQty = (newQty) => {
    if (newQty < 1) return;
    setQty(newQty);
    onUpdate(item.id, newQty);
  };

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(item.id);
  };

  return (
    <Motion.div
      layout
      variants={fadeUp}
      custom={index}
      exit={{ opacity: 0, x: isRTL ? 48 : -48, transition: { duration: 0.28 } }}
      style={{
        background: T.bgCard,
        border:     `1px solid ${T.border}`,
        borderRadius: '4px',
        padding:    '16px',
        display:    'flex',
        flexDirection: 'row',
        gap:        '16px',
        alignItems: 'flex-start',
        opacity:    removing ? 0.45 : 1,
        transition: 'opacity 0.3s, border-color 0.25s',
      }}
    >
      {/* ── Image ── */}
      <Link to={`/products/${item.variant?.product?.slug || ''}`} style={{ flexShrink: 0 }}>
        <div style={{
          width: '110px',
          height: '140px',
          borderRadius: '4px', overflow: 'hidden',
          background: T.bgHover,
        }}>
          {productImage ? (
            <img
              loading="lazy"
              src={imageSrc}
              alt={item.variant?.product?.name}
              onError={() => setImageError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '9px', letterSpacing: '2px', color: T.textMuted,
              }}>NO IMAGE</span>
            </div>
          )}
        </div>
      </Link>

      {/* ── Info ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Category */}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '10px', color: T.textMuted,
          letterSpacing: '3px', marginBottom: '5px',
          textTransform: 'uppercase',
        }}>
          {item.variant?.product?.category?.name}
        </div>

        {/* Name */}
        <Link to={`/products/${item.variant?.product?.slug || ''}`} style={{ textDecoration: 'none' }}>
          <div
            onMouseEnter={e => e.currentTarget.style.color = T.stone}
            onMouseLeave={e => e.currentTarget.style.color = T.textPrimary}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500, fontSize: '14px',
              color: T.textPrimary, marginBottom: '4px',
              lineHeight: 1.35, transition: 'color 0.2s',
              letterSpacing: '0.2px',
            }}
          >
            {item.variant?.product?.name}
          </div>
        </Link>

        {/* Variant */}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '10px', color: T.textMuted,
          letterSpacing: '2px', marginBottom: '14px',
        }}>
          {variantLabel?.toUpperCase()}
        </div>

        {/* Quantity controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: '2px', overflow: 'hidden',
          }}>
            {[
              { label: '−', action: () => handleQty(qty - 1), disabled: qty <= 1 },
              { label: '+', action: () => handleQty(qty + 1), disabled: !item.is_available || qty >= item.variant?.stock?.quantity },
            ].map((btn, i) => (
              <Motion.button
                key={i}
                whileTap={{ scale: 0.8 }}
                onClick={btn.action}
                disabled={btn.disabled}
                style={{
                  width: '34px', height: '34px',
                  background: 'transparent', border: 'none',
                  color: btn.disabled ? T.textMuted : T.textSecond,
                  fontSize: '16px', cursor: btn.disabled ? 'not-allowed' : 'pointer',
                  order: i === 0 ? 0 : 2,
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{btn.label}</Motion.button>
            ))}
            <div style={{
              width: '38px', height: '34px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '16px', letterSpacing: '1px',
              color: T.textPrimary,
              borderLeft:  `1px solid ${T.border}`,
              borderRight: `1px solid ${T.border}`,
              order: 1,
            }}>
              {qty}
            </div>
          </div>

          {/* Out-of-stock warning */}
          {!item.is_available && (
            <Motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '10px', letterSpacing: '2px',
                color: T.danger, background: T.dangerBg,
                border: `1px solid rgba(185,28,28,0.2)`,
                padding: '4px 10px', borderRadius: '2px',
              }}
            >
              {t('products.out_of_stock')}
            </Motion.span>
          )}
        </div>
      </div>

      {/* ── Price + Remove ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', gap: '10px',
        flexShrink: 0,
      }}>
        {/* Subtotal */}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '20px', letterSpacing: '1px',
          color: T.textPrimary, whiteSpace: 'nowrap',
          lineHeight: 1,
        }}>
          {Number(item.subtotal).toLocaleString()}
          <span style={{ fontSize: '11px', letterSpacing: '2px', color: T.textMuted, marginLeft: '4px' }}>
            {t('common.egp')}
          </span>
        </div>

        {/* Unit × qty */}
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '12px', color: T.textMuted,
          fontWeight: 400,
        }}>
          {Number(item.variant?.effective_price ?? item.variant?.price ?? 0).toLocaleString()} × {qty}
        </div>

        {/* Remove button */}
        <Motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRemove}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = T.danger;
            e.currentTarget.style.color       = T.danger;
            e.currentTarget.style.background  = T.dangerBg;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.color       = T.textMuted;
            e.currentTarget.style.background  = 'transparent';
          }}
          style={{
            background:   'transparent',
            border:       `1px solid ${T.border}`,
            borderRadius: '2px',
            padding:      '6px 12px',
            color:        T.textMuted,
            cursor:       'pointer',
            fontFamily:   "'Bebas Neue', sans-serif",
            fontSize:     '11px', letterSpacing: '2px',
            transition:   'all 0.2s',
            display:      'flex', alignItems: 'center', gap: '6px',
          }}
        >
          ✕ {t('cart.remove')}
        </Motion.button>
      </div>
    </Motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   EMPTY CART
══════════════════════════════════════════════════════════════════════════════ */
function EmptyCart({ t, isRTL }) {
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{
        textAlign: 'center', padding: '100px 20px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '20px',
      }}
    >
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '80px', letterSpacing: '4px',
        color: T.textMuted, lineHeight: 1,
      }}>
        CART
      </div>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '18px', letterSpacing: '6px',
        color: T.textMuted,
      }}>
        {t('cart.empty')}
      </div>
      <p style={{
        fontFamily: "'Inter', sans-serif",
        color: T.textMuted, fontSize: '14px',
        maxWidth: '280px', lineHeight: 1.7, fontWeight: 400,
      }}>
        {isRTL
          ? 'لم تضف أي منتجات بعد.'
          : "You haven't added anything yet."}
      </p>
      <Link to="/products" style={{ textDecoration: 'none' }}>
        <Motion.button
          whileHover={{ background: T.stone, color: '#0A0A0A' }}
          whileTap={{ scale: 0.97 }}
          style={{
            background:   T.textPrimary,
            border:       'none',
            borderRadius: '2px',
            padding:      '14px 40px',
            color:        '#0A0A0A',
            fontFamily:   "'Bebas Neue', sans-serif",
            fontSize:     '14px', letterSpacing: '4px',
            cursor:       'pointer', transition: 'background 0.25s',
          }}
        >
          {t('cart.continue')}
        </Motion.button>
      </Link>
    </Motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ORDER SUMMARY
══════════════════════════════════════════════════════════════════════════════ */
function OrderSummary({ cart, t, isRTL, onCheckout, isLoading, regions, selectedRegionId, onSelectRegion, regionsError }) {
  const total          = Number(cart?.total_price || 0);
  const selectedRegion = (regions || []).find(r => String(r.id) === String(selectedRegionId));
  const shipping       = selectedRegion ? Number(selectedRegion.price) : 0;
  const grand          = total + shipping;
  const freeShipTarget = 500;
  const progress       = Math.min((total / freeShipTarget) * 100, 100);

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };
  const labelStyle = {
    fontFamily: "'Inter', sans-serif",
    color: T.textMuted, fontSize: '13px', fontWeight: 400,
  };
  const valueStyle = {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '15px', letterSpacing: '1px', color: T.textPrimary,
  };

  return (
    <Motion.div
      initial={{ opacity: 0, x: isRTL ? -32 : 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      style={{
        background:   T.bgCard,
        border:       `1px solid ${T.border}`,
        borderRadius: '4px',
        padding:      '28px 24px',
        position:     'sticky', top: '90px',
      }}
    >
      {/* Title */}
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '20px', letterSpacing: '4px',
        color: T.textPrimary, marginBottom: '28px',
      }}>
        {isRTL ? 'ملخص الطلب' : 'ORDER SUMMARY'}
      </div>

      {/* Governorate selector */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '10px', letterSpacing: '3px',
          color: T.textMuted, marginBottom: '8px',
        }}>
          {isRTL ? 'المحافظة' : 'GOVERNORATE'}
        </div>
        <select
          value={selectedRegionId || ''}
          onChange={e => onSelectRegion(e.target.value)}
          style={{
            width:        '100%',
            background:   T.bg,
            border:       `1px solid ${T.border}`,
            borderRadius: '2px',
            padding:      '10px 12px',
            color:        selectedRegionId ? T.textPrimary : T.textMuted,
            fontFamily:   "'Inter', sans-serif",
            fontSize:     '13px',
            outline:      'none',
            cursor:       'pointer',
            appearance:   'none',
          }}
          onFocus={e  => { e.target.style.borderColor = T.stone; }}
          onBlur={e   => { e.target.style.borderColor = T.border; }}
        >
          <option value="" style={{ background: T.bgCard }}>
            {isRTL ? '— اختر المحافظة —' : '— Select Governorate —'}
          </option>
          {(regions || []).map(r => (
            <option key={r.id} value={r.id} style={{ background: T.bgCard }}>{r.name}</option>
          ))}
        </select>
        {regionsError && (
          <div style={{ fontSize: '11px', color: T.danger, marginTop: '6px', fontFamily: "'Inter', sans-serif" }}>
            {isRTL ? 'تعذر تحميل المحافظات' : 'Failed to load governorates.'}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: T.border, marginBottom: '20px' }} />

      {/* Lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        {/* Subtotal */}
        <div style={rowStyle}>
          <span style={labelStyle}>{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
          <span style={valueStyle}>{total.toLocaleString()} <span style={{ fontSize: '11px', color: T.textMuted }}>{t('common.egp')}</span></span>
        </div>

        {/* Shipping */}
        <div style={rowStyle}>
          <span style={labelStyle}>{isRTL ? 'الشحن' : 'Shipping'}</span>
          <span style={{
            ...valueStyle,
            color: shipping === 0 && selectedRegion ? T.success : T.textPrimary,
          }}>
            {!selectedRegion
              ? <span style={{ fontSize: '11px', color: T.textMuted }}>—</span>
              : shipping === 0
                ? (isRTL ? 'مجاني' : 'FREE')
                : `${shipping.toLocaleString()} EGP`}
          </span>
        </div>

        {/* Free shipping progress bar */}
        {shipping > 0 && total < freeShipTarget && (
          <div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px', color: T.textMuted, marginBottom: '7px',
            }}>
              {isRTL
                ? `أضف ${(freeShipTarget - total).toLocaleString()} ج.م للشحن المجاني`
                : `Add ${(freeShipTarget - total).toLocaleString()} EGP for free shipping`}
            </div>
            <div style={{ height: '3px', background: T.bgHover, borderRadius: '2px', overflow: 'hidden' }}>
              <Motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: T.gold, borderRadius: '2px' }}
              />
            </div>
          </div>
        )}

        {/* No region warning */}
        {!selectedRegion && (
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px', color: T.danger,
          }}>
            {isRTL ? 'اختر المحافظة لحساب الشحن' : 'Select a governorate to calculate shipping.'}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: T.border, marginBottom: '20px' }} />

      {/* Grand total */}
      <div style={{ ...rowStyle, marginBottom: '24px' }}>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '14px', letterSpacing: '3px', color: T.textSecond,
        }}>
          {t('cart.total')}
        </span>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '28px', letterSpacing: '1px',
          color: T.textPrimary, lineHeight: 1,
        }}>
          {grand.toLocaleString()}
          <span style={{ fontSize: '13px', letterSpacing: '2px', color: T.textMuted, marginLeft: '4px' }}>
            {t('common.egp')}
          </span>
        </span>
      </div>

      {/* Checkout CTA */}
      <Motion.button
        whileHover={!isLoading && selectedRegion ? { background: T.stone } : {}}
        whileTap={selectedRegion ? { scale: 0.97 } : {}}
        onClick={onCheckout}
        disabled={isLoading || !selectedRegion}
        style={{
          width:        '100%',
          background:   (!isLoading && selectedRegion) ? T.textPrimary : T.bgHover,
          border:       'none',
          borderRadius: '2px',
          padding:      '16px',
          color:        (!isLoading && selectedRegion) ? '#0A0A0A' : T.textMuted,
          fontFamily:   "'Bebas Neue', sans-serif",
          fontSize:     '15px', letterSpacing: '4px',
          cursor:       (isLoading || !selectedRegion) ? 'not-allowed' : 'pointer',
          marginBottom: '10px',
          display:      'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition:   'background 0.25s, color 0.25s',
        }}
      >
        {isLoading ? (
          <Motion.span animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
            ⟳
          </Motion.span>
        ) : (
          `${t('cart.checkout')} →`
        )}
      </Motion.button>

      {/* Continue shopping */}
      <Link to="/products" style={{ textDecoration: 'none' }}>
        <Motion.button
          whileHover={{ borderColor: T.stone, color: T.stone }}
          style={{
            width:        '100%',
            background:   'transparent',
            border:       `1px solid ${T.border}`,
            borderRadius: '2px',
            padding:      '14px',
            color:        T.textMuted,
            fontFamily:   "'Bebas Neue', sans-serif",
            fontSize:     '13px', letterSpacing: '3px',
            cursor:       'pointer', transition: 'all 0.2s',
          }}
        >
          {t('cart.continue')}
        </Motion.button>
      </Link>

      {/* Trust row */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '0',
        marginTop: '24px', paddingTop: '20px',
        borderTop: `1px solid ${T.border}`,
      }}>
        {[
          { icon: '🔒', en: 'SECURE', ar: 'آمن' },
          { icon: '↩',  en: 'RETURNS', ar: 'إرجاع' },
          { icon: '🚚', en: 'FAST', ar: 'سريع' },
        ].map((b, i) => (
          <div key={i} style={{
            flex: 1,
            borderLeft: i > 0 ? `1px solid ${T.border}` : 'none',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '16px', marginBottom: '4px' }}>{b.icon}</div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '9px', letterSpacing: '2px', color: T.textMuted,
            }}>
              {isRTL ? b.ar : b.en}
            </div>
          </div>
        ))}
      </div>
    </Motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════════════════ */
function CartSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[...Array(3)].map((_, i) => (
          <Motion.div key={i}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }}
            style={{ height: '130px', background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: '4px' }}
          />
        ))}
      </div>
      <Motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ height: '380px', background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: '4px' }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function Cart() {
  const { i18n }     = useTranslation();
  const isRTL        = i18n.language === 'ar';
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  const t = (key) => {
    const map = {
      'products.out_of_stock': isRTL ? 'نفد المخزون' : 'OUT OF STOCK',
      'common.egp':            isRTL ? 'ج.م' : 'EGP',
      'cart.remove':           isRTL ? 'حذف' : 'REMOVE',
      'cart.empty':            isRTL ? 'سلتك فارغة' : 'YOUR CART IS EMPTY',
      'cart.continue':         isRTL ? 'متابعة التسوق' : 'CONTINUE SHOPPING',
      'cart.total':            isRTL ? 'الإجمالي' : 'TOTAL',
      'cart.checkout':         isRTL ? 'إتمام الطلب' : 'CHECKOUT',
      'nav.cart':              isRTL ? 'السلة' : 'CART',
      'cart.title':            isRTL ? 'سلة التسوق' : 'SHOPPING CART',
    };
    return map[key] ?? key;
  };

  /* ── Queries ── */
  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn:  () => api.get('/cart/').then(r => r.data),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, quantity }) => api.patch(`/cart/item/${id}/`, { quantity }),
    onSuccess:  () => queryClient.invalidateQueries(['cart']),
  });

  const removeItem = useMutation({
    mutationFn: (id) => api.delete(`/cart/item/${id}/`),
    onSuccess:  () => queryClient.invalidateQueries(['cart']),
  });

  const clearCart = useMutation({
    mutationFn: () => api.delete('/cart/clear/'),
    onSuccess:  () => queryClient.invalidateQueries(['cart']),
  });

  /* ── Shipping regions ── */
  const [selectedRegionId, setSelectedRegionId] = useState(
    () => localStorage.getItem('selected_shipping_region') || ''
  );
  const { data: regionsData, isError: regionsError } = useQuery({
    queryKey: ['shipping-regions'],
    queryFn:  () => api.get('/orders/shipping-regions/').then(r => r.data),
  });
  const regions = normalizeShippingRegions(regionsData);
  useEffect(() => {
    localStorage.setItem('selected_shipping_region', selectedRegionId);
  }, [selectedRegionId]);

  /* ── Checkout ── */
  const handleCheckout = () => {
    const soldOut = items.filter(
      item => item.variant?.product?.is_sold_out || item.variant?.product?.stock_status === 'sold_out'
    );
    if (soldOut.length > 0) {
      alert(isRTL
        ? 'يوجد منتجات نافدة في سلتك. يرجى إزالتها أولاً.'
        : 'Some items are sold out. Please remove them first.');
      return;
    }
    navigate('/checkout');
  };

  const items = cart?.items || [];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '40px 5% 80px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '48px', flexWrap: 'wrap', gap: '16px',
          }}
        >
          <div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '11px', color: T.stone,
              letterSpacing: '5px', marginBottom: '10px',
            }}>
              ✦ {t('nav.cart')}
            </div>
            <h1 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(36px, 6vw, 72px)',
              fontWeight: 400, lineHeight: 0.95,
              letterSpacing: '3px', color: T.textPrimary, margin: 0,
            }}>
              {t('cart.title')}
              {items.length > 0 && (
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '16px', fontWeight: 400,
                  color: T.textMuted, marginLeft: '14px',
                  letterSpacing: 0,
                }}>
                  ({items.length})
                </span>
              )}
            </h1>
          </div>

          {/* Clear all */}
          {items.length > 0 && (
            <Motion.button
              whileHover={{ borderColor: T.danger, color: T.danger }}
              whileTap={{ scale: 0.95 }}
              onClick={() => clearCart.mutate()}
              style={{
                background:   'transparent',
                border:       `1px solid ${T.border}`,
                borderRadius: '2px',
                padding:      '10px 20px',
                color:        T.textMuted,
                cursor:       'pointer',
                fontFamily:   "'Bebas Neue', sans-serif",
                fontSize:     '11px', letterSpacing: '2px',
                transition:   'all 0.2s',
                alignSelf:    'flex-end',
              }}
            >
              ✕ {isRTL ? 'مسح الكل' : 'CLEAR ALL'}
            </Motion.button>
          )}
        </Motion.div>

        {/* ── Content ── */}
        {isLoading ? (
          <CartSkeleton />
        ) : items.length === 0 ? (
          <EmptyCart t={t} isRTL={isRTL} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px', alignItems: 'start',
          }}>

            {/* Items list */}
            <Motion.div
              initial="hidden"
              animate="visible"
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <AnimatePresence mode="popLayout">
                {items.map((item, i) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    index={i}
                    t={t}
                    isRTL={isRTL}
                    onUpdate={(id, qty) => updateItem.mutate({ id, quantity: qty })}
                    onRemove={(id)      => removeItem.mutate(id)}
                  />
                ))}
              </AnimatePresence>

              {/* Unavailable items banner */}
              {items.some(i => !i.is_available) && (
                <Motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background:   T.dangerBg,
                    border:       `1px solid rgba(185,28,28,0.25)`,
                    borderRadius: '2px',
                    padding:      '14px 18px',
                    display:      'flex', alignItems: 'center', gap: '12px',
                    fontFamily:   "'Inter', sans-serif",
                    color:        T.danger, fontSize: '13px', fontWeight: 400,
                  }}
                >
                  <span>⚠</span>
                  {isRTL
                    ? 'بعض المنتجات غير متاحة، يرجى مراجعة سلتك قبل الإتمام'
                    : 'Some items are unavailable. Please review before checkout.'}
                </Motion.div>
              )}
            </Motion.div>

            {/* Order Summary */}
            <OrderSummary
              cart={cart}
              t={t}
              isRTL={isRTL}
              onCheckout={handleCheckout}
              isLoading={updateItem.isLoading || removeItem.isLoading}
              regions={regions}
              selectedRegionId={selectedRegionId}
              onSelectRegion={setSelectedRegionId}
              regionsError={regionsError}
            />
          </div>
        )}
      </div>
    </div>
  );
}