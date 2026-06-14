import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAddToCartMutation } from '../hooks/useCartActions';

/* ─── Design Tokens ────────────────────────────────────────────────────────── */
const T = {
  bg:          '#0A0A0A',
  bgCard:      '#111111',
  bgHover:     '#1A1A1A',
  border:      'rgba(216,210,194,0.12)',
  borderHover: 'rgba(216,210,194,0.3)',
  textPrimary: '#FFFFFF',
  textSecond:  '#D9D9D9',
  textMuted:   'rgba(217,217,217,0.4)',
  stone:       '#D8D2C2',
  gold:        '#B89B5E',
  goldGlow:    'rgba(184,155,94,0.10)',
  green:       '#2F4F3E',
  danger:      '#B91C1C',
  success:     '#15803D',
  warning:     '#B45309',
};

/* ─── Animation Variants ─────────────────────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

/* ══════════════════════════════════════════════════════════════════════════════
   IMAGE GALLERY
══════════════════════════════════════════════════════════════════════════════ */
function ImageGallery({ images, name }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const imgs = images?.length ? images : [{ image: null, alt_text: name }];

  return (
    <div style={{ position: 'sticky', top: '90px' }}>

      {/* Main image — full aspect ratio, no cropping */}
      <div
        onClick={() => setZoomed(true)}
        style={{
          borderRadius: '4px', overflow: 'hidden',
          cursor: 'zoom-in',
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          marginBottom: '12px', position: 'relative',
          width: '100%',
        }}
      >
        <AnimatePresence mode="wait">
          <Motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%' }}
          >
            {imgs[active]?.image ? (
              <img
                loading="lazy"
                src={imgs[active].image}
                alt={imgs[active].alt_text || name}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                aspectRatio: '3/4',
                background: T.bgHover,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '18px', letterSpacing: '6px', color: T.textMuted,
                }}>NO IMAGE</span>
              </div>
            )}
          </Motion.div>
        </AnimatePresence>

        {/* Zoom hint */}
        <div style={{
          position: 'absolute', bottom: '12px', right: '12px',
          background: 'rgba(0,0,0,0.6)', borderRadius: '2px',
          padding: '5px 10px', fontSize: '11px',
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: '2px', color: T.stone,
          backdropFilter: 'blur(6px)',
        }}>
          ZOOM
        </div>
      </div>

      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {imgs.map((img, i) => (
            <Motion.div
              key={i}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActive(i)}
              style={{
                width: '80px', height: '80px',
                borderRadius: '4px', overflow: 'hidden',
                border: `1.5px solid ${active === i ? T.gold : T.border}`,
                cursor: 'pointer', flexShrink: 0,
                transition: 'border-color 0.2s',
                background: T.bgCard,
              }}
            >
              {img.image ? (
                <img src={img.image} alt={img.alt_text} loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: T.bgHover }} />
              )}
            </Motion.div>
          ))}
        </div>
      )}

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomed && (
          <Motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setZoomed(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 999,
              background: 'rgba(0,0,0,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px', cursor: 'zoom-out',
              backdropFilter: 'blur(16px)',
            }}
          >
            <Motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
              src={imgs[active]?.image}
              alt={name}
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '4px' }}
            />
            <button onClick={() => setZoomed(false)} style={{
              position: 'fixed', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${T.border}`,
              borderRadius: '2px', width: '40px', height: '40px',
              color: T.stone, fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   VARIANT SELECTOR
══════════════════════════════════════════════════════════════════════════════ */
function VariantSelector({ variants, selected, onSelect }) {
  const colors = useMemo(() => {
    const map = new Map();
    variants?.forEach(v => { if (v.color?.name && !map.has(v.color.name)) map.set(v.color.name, v.color); });
    return Array.from(map.values());
  }, [variants]);

  const sizes = useMemo(() => {
    const map = new Map();
    variants?.forEach(v => { if (v.size?.name && !map.has(v.size.name)) map.set(v.size.name, v.size); });
    return Array.from(map.values());
  }, [variants]);

  const selectedColor = selected?.color?.name || '';
  const selectedSize  = selected?.size?.name  || '';

  const choose = ({ colorName = selectedColor, sizeName = selectedSize }) => {
    const next =
      variants.find(v => (!colorName || v.color?.name === colorName) && (!sizeName || v.size?.name === sizeName) && v.stock?.is_available) ||
      variants.find(v => (!colorName || v.color?.name === colorName) && (!sizeName || v.size?.name === sizeName));
    if (next) onSelect(next);
  };

  const labelStyle = {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '11px', letterSpacing: '3px',
    color: T.textMuted, marginBottom: '10px',
    display: 'block',
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '11px', letterSpacing: '3px',
        color: T.stone, marginBottom: '18px',
      }}>
        {selected
          ? `✦ ${[selected.color?.name, selected.size?.name].filter(Boolean).join(' / ').toUpperCase()}`
          : '✦ SELECT OPTIONS'}
      </div>

      {colors.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <span style={labelStyle}>COLOR</span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {colors.map(color => {
              const isSelected = selectedColor === color.name;
              return (
                <Motion.button
                  key={color.id || color.name}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => choose({ colorName: color.name })}
                  title={color.name}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: `2px solid ${isSelected ? T.gold : T.border}`,
                    background: color.hex_code || T.bgCard,
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 0 0 3px ${T.bgCard}, 0 0 0 5px ${T.gold}` : 'none',
                    transition: 'all 0.2s',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <span style={labelStyle}>SIZE</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sizes.map(size => {
              const candidate   = variants.find(v => v.size?.name === size.name && (!selectedColor || v.color?.name === selectedColor));
              const isAvailable = candidate?.stock?.is_available;
              const isSelected  = selectedSize === size.name;
              return (
                <Motion.button
                  key={size.id || size.name}
                  whileHover={{ borderColor: isAvailable ? T.stone : T.border }}
                  whileTap={{ scale: isAvailable ? 0.95 : 1 }}
                  onClick={() => isAvailable && choose({ sizeName: size.name })}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '2px',
                    border: `1px solid ${isSelected ? T.gold : T.border}`,
                    background: isSelected ? T.goldGlow : 'transparent',
                    color: isAvailable
                      ? isSelected ? T.gold : T.textSecond
                      : T.textMuted,
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '13px', letterSpacing: '2px',
                    textDecoration: !isAvailable ? 'line-through' : 'none',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  {size.name}
                </Motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   QUANTITY SELECTOR
══════════════════════════════════════════════════════════════════════════════ */
function QuantitySelector({ quantity, setQuantity, max }) {
  const btnStyle = (disabled) => ({
    width: '44px', height: '44px',
    background: 'transparent', border: 'none',
    color: disabled ? T.textMuted : T.textPrimary,
    fontSize: '20px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: "'Inter', sans-serif", fontWeight: 300,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.2s',
  });

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: '2px', overflow: 'hidden',
    }}>
      <Motion.button whileTap={{ scale: 0.85 }}
        onClick={() => setQuantity(q => Math.max(1, q - 1))}
        disabled={quantity <= 1}
        style={btnStyle(quantity <= 1)}
      >−</Motion.button>

      <div style={{
        width: '52px', height: '44px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px',
        color: T.textPrimary, letterSpacing: '1px',
        borderLeft:  `1px solid ${T.border}`,
        borderRight: `1px solid ${T.border}`,
      }}>
        {quantity}
      </div>

      <Motion.button whileTap={{ scale: 0.85 }}
        onClick={() => setQuantity(q => Math.min(max, q + 1))}
        disabled={quantity >= max}
        style={btnStyle(quantity >= max)}
      >+</Motion.button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════════════════════════ */
function Toast({ message, type }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{    opacity: 0, y: 32, scale: 0.95 }}
      style={{
        position: 'fixed', bottom: '32px',
        left: '50%', transform: 'translateX(-50%)',
        background: type === 'success' ? T.green : T.danger,
        color: T.stone,
        borderRadius: '2px',
        padding: '13px 28px',
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '14px', letterSpacing: '3px',
        zIndex: 9999,
        border: `1px solid ${type === 'success' ? 'rgba(47,79,62,0.6)' : 'rgba(185,28,28,0.5)'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {type === 'success' ? '✓ ' : '✕ '}{message}
    </Motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════════════════ */
function ProductDetailSkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '55% 1fr',
      gap: '60px', padding: '40px 5%',
      maxWidth: '1400px', margin: '0 auto',
    }}>
      <Motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
        <div style={{ aspectRatio: '3/4', background: T.bgCard, borderRadius: '4px', marginBottom: '12px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ width: '80px', height: '80px', background: T.bgCard, borderRadius: '4px' }} />
          ))}
        </div>
      </Motion.div>
      <Motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.2 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {[25, 55, 35, 70, 30, 50].map((w, i) => (
          <div key={i} style={{
            height: i === 1 ? '44px' : i === 3 ? '72px' : '16px',
            width: `${w}%`, background: T.bgCard, borderRadius: '2px',
          }} />
        ))}
      </Motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function ProductDetail() {
  const { slug }   = useParams();
  const { i18n }   = useTranslation();
  const isRTL      = i18n.language === 'ar';
  const navigate   = useNavigate();

  const t = (key) => {
    const map = {
      'common.error':          isRTL ? 'خطأ' : 'Error',
      'common.back':           isRTL ? 'رجوع' : 'Back',
      'nav.home':              isRTL ? 'الرئيسية' : 'Home',
      'nav.products':          isRTL ? 'المنتجات' : 'Products',
      'products.out_of_stock': isRTL ? 'نفد المخزون' : 'OUT OF STOCK',
      'common.egp':            isRTL ? 'ج.م' : 'EGP',
      'cart.quantity':         isRTL ? 'الكمية' : 'QUANTITY',
      'products.add_to_cart':  isRTL ? 'أضف للسلة' : 'ADD TO CART',
    };
    return map[key] ?? key;
  };

  const [selectedVariantOverride, setSelectedVariantOverride] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [toast,    setToast]    = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn:  () => api.get(`/products/items/${slug}/`).then(r => r.data),
  });

  const addToCart = useAddToCartMutation({
    onSuccess: () => showToast(isRTL ? 'تمت الإضافة للسلة' : 'ADDED TO CART', 'success'),
    onError: (err) => {
      const msg = err.response?.data?.quantity?.[0]
        || err.response?.data?.detail
        || (isRTL ? 'حدث خطأ' : 'SOMETHING WENT WRONG');
      showToast(msg, 'error');
    },
  });

  if (isLoading) return <ProductDetailSkeleton />;

  if (isError) return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '20px',
    }}>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '48px', letterSpacing: '4px', color: T.textMuted,
      }}>
        PRODUCT NOT FOUND
      </div>
      <Motion.button
        whileHover={{ borderColor: T.stone, color: T.stone }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/products')}
        style={{
          background: 'transparent',
          border: `1px solid ${T.border}`,
          borderRadius: '2px', padding: '12px 32px',
          color: T.textMuted, cursor: 'pointer',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '13px', letterSpacing: '3px',
          transition: 'all 0.2s',
        }}
      >
        ← {t('common.back')}
      </Motion.button>
    </div>
  );

  const selectedVariant = selectedVariantOverride
    || product?.variants?.find(v => v.stock?.is_available)
    || product?.variants?.[0]
    || null;

  const maxQty          = selectedVariant?.stock?.quantity || 1;
  const isProductSoldOut = Boolean(product?.is_sold_out || product?.stock_status === 'sold_out');
  const canAdd          = Boolean(selectedVariant?.stock?.is_available && quantity > 0 && !isProductSoldOut);
  const basePrice       = Number(selectedVariant?.price ?? product?.base_price ?? 0);
  const effectivePrice  = Number(selectedVariant?.effective_price ?? product?.discounted_price ?? basePrice);
  const hasDiscount     = effectivePrice < basePrice;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '40px 5% 80px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── Breadcrumb ── */}
        <Motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '48px', flexWrap: 'wrap',
          }}
        >
          {[
            { to: '/',         label: t('nav.home') },
            { to: '/products', label: t('nav.products') },
            { to: null,        label: product?.name },
          ].map((crumb, i, arr) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {crumb.to ? (
                <Link to={crumb.to}
                  onMouseEnter={e => e.currentTarget.style.color = T.stone}
                  onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
                  style={{
                    color: T.textMuted, textDecoration: 'none',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '11px', letterSpacing: '2px',
                    transition: 'color 0.2s',
                  }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{
                  color: T.stone,
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '11px', letterSpacing: '2px',
                }}>
                  {crumb.label}
                </span>
              )}
              {i < arr.length - 1 && (
                <span style={{ color: T.textMuted, fontSize: '10px', opacity: 0.5 }}>
                  {isRTL ? '←' : '→'}
                </span>
              )}
            </span>
          ))}
        </Motion.div>

        {/* ── Main Grid: fixed columns so image never gets cut ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 55%) minmax(0, 45%)',
          gap: '64px',
          alignItems: 'start',
        }}>

          {/* Gallery — RTL: يجي على اليمين */}
          {isRTL ? null : (
            <Motion.div
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <ImageGallery images={product?.images} name={product?.name} />
            </Motion.div>
          )}

          {/* Info */}
          <Motion.div
            initial={{ opacity: 0, x: isRTL ? -32 : 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Eyebrow */}
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '12px', marginBottom: '16px', flexWrap: 'wrap',
            }}>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '11px', color: T.stone,
                letterSpacing: '3px',
              }}>
                ✦ {product?.category?.name?.toUpperCase()}
              </span>

              {product?.is_featured && (
                <span style={{
                  background: T.green,
                  color: T.stone, borderRadius: '2px',
                  padding: '3px 10px',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '10px', letterSpacing: '2px',
                }}>
                  FEATURED
                </span>
              )}

              {(isProductSoldOut || !product?.in_stock) && (
                <span style={{
                  background: T.danger, color: '#fff',
                  borderRadius: '2px', padding: '3px 10px',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '10px', letterSpacing: '2px',
                }}>
                  {t('products.out_of_stock')}
                </span>
              )}
            </div>

            {/* Product name */}
            <Motion.h1
              variants={fadeUp} custom={1}
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(36px, 5vw, 64px)',
                fontWeight: 400,
                color: T.textPrimary,
                lineHeight: 0.95,
                letterSpacing: '2px',
                marginBottom: '28px',
              }}
            >
              {product?.name}
            </Motion.h1>

            {/* Price */}
            <Motion.div variants={fadeUp} custom={2} style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(36px, 4vw, 52px)',
                  color: hasDiscount ? T.gold : T.textPrimary,
                  lineHeight: 1, letterSpacing: '1px',
                }}>
                  {effectivePrice.toLocaleString()}
                </span>
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '16px', letterSpacing: '3px', color: T.textMuted,
                }}>
                  {t('common.egp')}
                </span>
                {hasDiscount && (
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px', color: T.textMuted,
                    textDecoration: 'line-through', fontWeight: 400,
                  }}>
                    {basePrice.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Stock indicator */}
              {selectedVariant && (
                <Motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    marginTop: '12px',
                    color: isProductSoldOut
                      ? T.danger
                      : selectedVariant.stock?.is_low_stock
                        ? T.warning
                        : T.success,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '12px', fontWeight: 500, letterSpacing: '0.5px',
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                  {isProductSoldOut
                    ? (isRTL ? 'نفدت الكمية' : 'Sold Out')
                    : selectedVariant.stock?.is_available
                      ? selectedVariant.stock?.is_low_stock
                        ? `${isRTL ? 'كمية محدودة' : 'Low stock'} — ${selectedVariant.stock.quantity} ${isRTL ? 'متبقي' : 'left'}`
                        : isRTL ? 'متاح' : 'In Stock'
                      : t('products.out_of_stock')}
                </Motion.div>
              )}
            </Motion.div>

            {/* Divider */}
            <div style={{ height: '1px', background: T.border, marginBottom: '28px' }} />

            {/* Description */}
            {product?.description && (
              <Motion.p
                variants={fadeUp} custom={3}
                style={{
                  color: T.textMuted,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px', lineHeight: 1.8,
                  marginBottom: '28px',
                  paddingBottom: '28px',
                  borderBottom: `1px solid ${T.border}`,
                  fontWeight: 400,
                }}
              >
                {product.description}
              </Motion.p>
            )}

            {/* Variants */}
            {product?.has_variants && product?.variants?.length > 0 && (
              <Motion.div variants={fadeUp} custom={4}>
                <VariantSelector
                  variants={product.variants}
                  selected={selectedVariant}
                  onSelect={setSelectedVariantOverride}
                />
              </Motion.div>
            )}

            {/* Quantity */}
            {canAdd && (
              <Motion.div variants={fadeUp} custom={5} style={{ marginBottom: '28px' }}>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '11px', letterSpacing: '3px',
                  color: T.textMuted, marginBottom: '12px',
                }}>
                  {t('cart.quantity')}
                </div>
                <QuantitySelector quantity={quantity} setQuantity={setQuantity} max={maxQty} />
              </Motion.div>
            )}

            {/* ── CTA Buttons ── */}
            <Motion.div variants={fadeUp} custom={6}
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '32px' }}>

              <Motion.button
                whileHover={canAdd ? { background: T.stone } : {}}
                whileTap={canAdd ? { scale: 0.97 } : {}}
                onClick={() => canAdd && addToCart.mutate({ variantId: selectedVariant.id, quantity })}
                disabled={!canAdd || addToCart.isLoading}
                style={{
                  flex: 1, minWidth: '200px',
                  background: canAdd ? T.textPrimary : T.bgHover,
                  border:     'none',
                  borderRadius: '2px',
                  padding: '16px 32px',
                  color:   canAdd ? '#0A0A0A' : T.textMuted,
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '16px', letterSpacing: '3px',
                  cursor: canAdd ? 'pointer' : 'not-allowed',
                  transition: 'background 0.25s',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '10px',
                }}
              >
                {addToCart.isLoading ? (
                  <Motion.span animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
                    ⟳
                  </Motion.span>
                ) : (
                  canAdd ? t('products.add_to_cart') : t('products.out_of_stock')
                )}
              </Motion.button>

              {canAdd && (
                <Link to="/checkout" style={{ textDecoration: 'none', flex: 1, minWidth: '140px' }}>
                  <Motion.button
                    whileHover={{ background: T.goldGlow, borderColor: T.gold, color: T.gold }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addToCart.mutate({ variantId: selectedVariant.id, quantity })}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: `1px solid ${T.border}`,
                      borderRadius: '2px', padding: '16px 24px',
                      color: T.textSecond,
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '16px', letterSpacing: '3px',
                      cursor: 'pointer', transition: 'all 0.25s',
                    }}
                  >
                    {isRTL ? 'اشتري الآن' : 'BUY NOW'}
                  </Motion.button>
                </Link>
              )}
            </Motion.div>

            {/* ── Trust badges ── */}
            <Motion.div
              variants={fadeUp} custom={7}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1px',
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              {[
                { icon: '🚚', en: 'FAST DELIVERY', ar: 'شحن سريع' },
                { icon: '↩',  en: 'FREE RETURNS',  ar: 'إرجاع مجاني' },
                { icon: '🔒', en: 'SECURE PAY',     ar: 'دفع آمن' },
              ].map((feat, i) => (
                <div key={i} style={{
                  background: T.bgCard,
                  padding: '16px 12px',
                  textAlign: 'center',
                  borderLeft: i > 0 ? `1px solid ${T.border}` : 'none',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>{feat.icon}</div>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '10px', letterSpacing: '2px',
                    color: T.textMuted,
                  }}>
                    {isRTL ? feat.ar : feat.en}
                  </div>
                </div>
              ))}
            </Motion.div>

          </Motion.div>

          {/* Gallery — RTL side */}
          {isRTL && (
            <Motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <ImageGallery images={product?.images} name={product?.name} />
            </Motion.div>
          )}

        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}