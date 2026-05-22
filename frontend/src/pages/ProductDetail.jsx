import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAddToCartMutation } from '../hooks/useCartActions';

// ─── Animation Variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }
  }),
};

// ─── Image Gallery ─────────────────────────────────────────────────────────────
function ImageGallery({ images, name }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const imgs = images?.length ? images : [{ image: null, alt_text: name }];

  return (
    <div style={{ position: 'sticky', top: '90px' }}>

      {/* Main Image */}
      <Motion.div
        layoutId="main-image"
        onClick={() => setZoomed(true)}
        style={{
          borderRadius: '24px', overflow: 'hidden',
          aspectRatio: '1', cursor: 'zoom-in',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          marginBottom: '16px', position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          <Motion.div key={active}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', height: '100%' }}
          >
            {imgs[active]?.image ? (
              <img
                  loading="lazy"
                src={imgs[active].image}
                alt={imgs[active].alt_text || name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, var(--bg-hover), var(--accent-glow))',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '96px',
              }}>
                📦
              </div>
            )}
          </Motion.div>
        </AnimatePresence>

        {/* Zoom Icon */}
        <div style={{
          position: 'absolute', bottom: '16px', right: '16px',
          background: 'rgba(0,0,0,0.5)', borderRadius: '10px',
          padding: '8px', fontSize: '16px', backdropFilter: 'blur(8px)',
        }}>
          🔍
        </div>
      </Motion.div>

      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {imgs.map((img, i) => (
            <Motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActive(i)}
              style={{
                width: '72px', height: '72px',
                borderRadius: '14px', overflow: 'hidden',
                border: `2px solid ${active === i ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer', flexShrink: 0,
                transition: 'border-color 0.2s',
              }}
            >
              {img.image ? (
                <img src={img.image} alt={img.alt_text} loading="lazy" width="96" height="96"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'var(--bg-hover)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '28px',
                }}>📦</div>
              )}
            </Motion.div>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomed && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomed(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 999,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px', cursor: 'zoom-out',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={imgs[active]?.image}
              alt={name}
              style={{
                maxWidth: '90vw', maxHeight: '90vh',
                objectFit: 'contain', borderRadius: '20px',
              }}
            />
            <button onClick={() => setZoomed(false)} style={{
              position: 'fixed', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: '50%', width: '44px', height: '44px',
              color: 'white', fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Variant Selector ──────────────────────────────────────────────────────────
function VariantSelector({ variants, selected, onSelect }) {
  const colors = useMemo(() => {
    const map = new Map();
    variants?.forEach((variant) => {
      if (variant.color?.name && !map.has(variant.color.name)) map.set(variant.color.name, variant.color);
    });
    return Array.from(map.values());
  }, [variants]);

  const sizes = useMemo(() => {
    const map = new Map();
    variants?.forEach((variant) => {
      if (variant.size?.name && !map.has(variant.size.name)) map.set(variant.size.name, variant.size);
    });
    return Array.from(map.values());
  }, [variants]);

  const selectedColor = selected?.color?.name || '';
  const selectedSize = selected?.size?.name || '';

  const choose = ({ colorName = selectedColor, sizeName = selectedSize }) => {
    const next = variants.find((variant) => (
      (!colorName || variant.color?.name === colorName) &&
      (!sizeName || variant.size?.name === sizeName) &&
      variant.stock?.is_available
    )) || variants.find((variant) => (
      (!colorName || variant.color?.name === colorName) &&
      (!sizeName || variant.size?.name === sizeName)
    ));
    if (next) onSelect(next);
  };
  
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{
        fontSize: '12px', fontWeight: 700, letterSpacing: '2px',
        color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase',        
      }}>
        ✦ {selected ? `${selected.color?.name || ''} ${selected.size?.name || ''}`.trim() : 'SELECT OPTIONS'}          
      </div>
      {colors.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Color</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {colors.map((color) => {
              const isSelected = selectedColor === color.name;
              return (
                <Motion.button key={color.id || color.name} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => choose({ colorName: color.name })} style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  border: `3px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: color.hex_code || 'var(--bg-card)', cursor: 'pointer',
                }} title={color.name} aria-label={color.name} />
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Size</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {sizes.map((size) => {
              const candidate = variants.find((variant) => variant.size?.name === size.name && (!selectedColor || variant.color?.name === selectedColor));
              const isAvailable = candidate?.stock?.is_available;
              const isSelected = selectedSize === size.name;
              return (
                <Motion.button key={size.id || size.name} type="button" whileHover={{ scale: isAvailable ? 1.05 : 1 }} whileTap={{ scale: isAvailable ? 0.95 : 1 }} onClick={() => choose({ sizeName: size.name })} style={{
                  padding: '10px 18px', borderRadius: '12px',
                  border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--accent-glow)' : 'var(--bg-card)',
                  color: isAvailable ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: 700,                  
                }}>
                  
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

// ─── Quantity Selector ─────────────────────────────────────────────────────────
function QuantitySelector({ quantity, setQuantity, max }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      {[
        { label: '−', action: () => setQuantity(q => Math.max(1, q - 1)), disabled: quantity <= 1 },
        { label: '+', action: () => setQuantity(q => Math.min(max, q + 1)), disabled: quantity >= max },
      ].map((btn, i) => (
        <Motion.button
          key={i}
          whileTap={{ scale: 0.9 }}
          onClick={btn.action}
          disabled={btn.disabled}
          style={{
            width: '44px', height: '44px',
            background: 'transparent', border: 'none',
            color: btn.disabled ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: '20px', cursor: btn.disabled ? 'not-allowed' : 'pointer',
            fontWeight: 300,
            order: i === 0 ? 0 : 2,
          }}
        >
          {btn.label}
        </Motion.button>
      ))}
      <div style={{
        width: '52px', height: '44px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)',
        order: 1,
        borderLeft:  '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
      }}>
        {quantity}
      </div>
    </div>
  );
}

// ─── Toast Notification ────────────────────────────────────────────────────────
function Toast({ message, type }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.9 }}
      style={{
        position: 'fixed', bottom: '32px',
        left: '50%', transform: 'translateX(-50%)',
        background: type === 'success' ? 'var(--success)' : 'var(--danger)',
        color: 'white', borderRadius: '16px',
        padding: '14px 28px', fontWeight: 700,
        fontSize: '15px', zIndex: 9999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
      }}
    >
      {type === 'success' ? '✓ ' : '✕ '}{message}
    </Motion.div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function ProductDetailSkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '60px', padding: '40px 5%', maxWidth: '1400px', margin: '0 auto',
    }}>
      <Motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div style={{
          aspectRatio: '1', background: 'var(--bg-card)',
          borderRadius: '24px', marginBottom: '16px',
        }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              width: '72px', height: '72px',
              background: 'var(--bg-card)', borderRadius: '14px',
            }} />
          ))}
        </div>
      </Motion.div>
      <Motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {[20, 60, 40, 80, 30, 50].map((w, i) => (
          <div key={i} style={{
            height: i === 1 ? '48px' : i === 3 ? '80px' : '20px',
            width: `${w}%`,
            background: 'var(--bg-card)', borderRadius: '10px',
          }} />
        ))}
      </Motion.div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProductDetail() {
  const { slug }              = useParams();
  const { i18n }          = useTranslation();
  
    const t = (key) => {
    const messages = {
      'common.error': isRTL ? 'خطأ' : 'Error',
      'common.back': isRTL ? 'رجوع' : 'Back',
      'nav.home': isRTL ? 'الرئيسية' : 'Home',
      'nav.products': isRTL ? 'المنتجات' : 'Products',
      'products.out_of_stock': isRTL ? 'نفد المخزون' : 'Out of stock',
      'common.egp': isRTL ? 'ج.م' : 'EGP',
      'cart.quantity': isRTL ? 'الكمية' : 'Quantity',
      'products.add_to_cart': isRTL ? 'أضف للسلة' : 'Add to cart',
    };
    return messages[key] ?? key;
  };
  const isRTL                 = i18n.language === 'ar';
  const navigate              = useNavigate();

  const [selectedVariantOverride, setSelectedVariantOverride] = useState(null);  
  const [quantity, setQuantity]               = useState(1);
  const [toast, setToast]                     = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Product
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn:  () => api.get(`/products/items/${slug}/`).then(r => r.data),    
  });

  // Add to Cart Mutation
  const addToCart = useAddToCartMutation({    
    onSuccess: () => {
      showToast(isRTL ? 'تمت الإضافة للسلة ✓' : 'Added to cart!', 'success');
    },
    onError: (err) => {
      const msg = err.response?.data?.quantity?.[0]
        || err.response?.data?.detail
        || (isRTL ? 'حدث خطأ' : 'Something went wrong');
      showToast(msg, 'error');
    },
  });

  if (isLoading) return <ProductDetailSkeleton />;

  if (isError) return (
    <div style={{
      minHeight: '60vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '16px',
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: '64px' }}>😕</div>
      <div style={{ fontSize: '20px', fontWeight: 700 }}>{t('common.error')}</div>
      <Motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/products')}
        style={{
          background: 'var(--accent-glow)', border: '1px solid var(--accent)',
          borderRadius: '14px', padding: '12px 28px',
          color: 'var(--accent)', fontWeight: 700, cursor: 'pointer',
        }}
      >
        {t('common.back')}
      </Motion.button>
    </div>
  );

  const selectedVariant = selectedVariantOverride
    || product?.variants?.find(v => v.stock?.is_available)
    || product?.variants?.[0]
    || null;
  const maxQty    = selectedVariant?.stock?.quantity || 1;
  const isProductSoldOut = Boolean(product?.is_sold_out || product?.stock_status === 'sold_out');
  const canAdd    = Boolean(selectedVariant?.stock?.is_available && quantity > 0 && !isProductSoldOut);
  const basePrice = Number(selectedVariant?.price ?? product?.base_price ?? 0);
  const effectivePrice = Number(selectedVariant?.effective_price ?? product?.discounted_price ?? basePrice);
  const hasDiscount = effectivePrice < basePrice;
  return (
    <div style={{ minHeight: '100vh', padding: '40px 5%' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Breadcrumb */}
        <Motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '40px', fontSize: '14px',
            color: 'var(--text-muted)', flexWrap: 'wrap',
          }}
        >
          {[
            { to: '/',         label: t('nav.home') },
            { to: '/products', label: t('nav.products') },
            { to: null,        label: product?.name },
          ].map((crumb, i, arr) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {crumb.to ? (
                <Link to={crumb.to} style={{
                  color: 'var(--text-muted)', textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {crumb.label}
                </span>
              )}
              {i < arr.length - 1 && (
                <span style={{ opacity: 0.4 }}>{isRTL ? '←' : '→'}</span>
              )}
            </span>
          ))}
        </Motion.div>

        {/* Main Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '60px', alignItems: 'start',
        }}>

          {/* ── Left: Gallery ── */}
          <Motion.div
            initial={{ opacity: 0, x: isRTL ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <ImageGallery images={product?.images} name={product?.name} />
          </Motion.div>

          {/* ── Right: Info ── */}
          <Motion.div
            initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* Category + Badge */}
            <Motion.div variants={fadeUp} custom={0} style={{
              display: 'flex', alignItems: 'center',
              gap: '12px', marginBottom: '16px', flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: '11px', color: 'var(--accent)',
                fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              }}>
                ✦ {product?.category?.name}
              </span>
              {product?.is_featured && (
                <span style={{
                  background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                  color: 'white', borderRadius: '8px',
                  padding: '3px 12px', fontSize: '11px', fontWeight: 700,
                }}>
                  FEATURED
                </span>
              )}
              {(isProductSoldOut || !product?.in_stock) && (                
                <span style={{
                  background: 'var(--danger)', color: 'white',
                  borderRadius: '8px', padding: '3px 12px',
                  fontSize: '11px', fontWeight: 700,
                }}>
                  {t('products.out_of_stock')}
                </span>
              )}
            </Motion.div>

            {/* Name */}
            <Motion.h1 variants={fadeUp} custom={1} style={{
              fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800,
              color: 'var(--text-primary)', lineHeight: 1.2,
              marginBottom: '24px',
              fontFamily: "'Syne', 'Cairo', sans-serif",
            }}>
              {product?.name}
            </Motion.h1>

            {/* Price */}
            <Motion.div variants={fadeUp} custom={2} style={{ marginBottom: '28px' }}>
              <div style={{
                fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800,
                background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}>
                {effectivePrice.toLocaleString()}                
                <span style={{ fontSize: '20px', marginInlineStart: '8px' }}>
                  {t('common.egp')}
                </span>
              </div>

              {hasDiscount && (
                <div style={{
                  marginTop: '10px',
                  color: 'var(--text-muted)',
                  textDecoration: 'line-through',
                  fontSize: '18px',
                  fontWeight: 600,
                }}>
                  {basePrice.toLocaleString()} {t('common.egp')}
                </div>
              )}
              {/* Stock Status */}
              {selectedVariant && (
                <Motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    marginTop: '12px',
                    color: selectedVariant.stock?.is_available
                      ? selectedVariant.stock?.is_low_stock
                        ? 'var(--warning)'
                        : 'var(--success)'
                      : 'var(--danger)',
                    fontSize: '13px', fontWeight: 700,
                  }}
                >
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'currentColor',
                  }} />
                  {isProductSoldOut
                    ? (isRTL ? 'نفدت الكمية (Sold Out)' : 'Sold Out')
                    : selectedVariant.stock?.is_available                  
                    ? selectedVariant.stock?.is_low_stock
                      ? `${isRTL ? 'كمية محدودة' : 'Low stock'} — ${selectedVariant.stock.quantity} ${isRTL ? 'متبقي' : 'left'}`
                      : isRTL ? 'متاح' : 'In Stock'
                    : t('products.out_of_stock')}
                </Motion.div>
              )}
            </Motion.div>

            {/* Description */}
            {product?.description && (
              <Motion.p variants={fadeUp} custom={3} style={{
                color: 'var(--text-secondary)', fontSize: '15px',
                lineHeight: 1.8, marginBottom: '28px',
                paddingBottom: '28px',
                borderBottom: '1px solid var(--border)',
              }}>
                {product.description}
              </Motion.p>
            )}

            {/* Variant Selector */}
            {product?.has_variants && product?.variants?.length > 0 && (              
              <Motion.div variants={fadeUp} custom={4}>
                <VariantSelector
                  variants={product.variants}
                  selected={selectedVariant}
                  onSelect={setSelectedVariantOverride}                  
                  t={t}
                />
              </Motion.div>
            )}

            {/* Quantity */}
            {canAdd && (
              <Motion.div variants={fadeUp} custom={5} style={{ marginBottom: '28px' }}>
                <div style={{
                  fontSize: '12px', fontWeight: 700, letterSpacing: '2px',
                  color: 'var(--text-muted)', marginBottom: '14px',
                  textTransform: 'uppercase',
                }}>
                  ✦ {t('cart.quantity')}
                </div>
                <QuantitySelector
                  quantity={quantity}
                  setQuantity={setQuantity}
                  max={maxQty}
                />
              </Motion.div>
            )}

            {/* Add to Cart CTA */}
            <Motion.div variants={fadeUp} custom={6}
              style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>

              <Motion.button
                whileHover={canAdd ? {
                  scale: 1.03,
                  boxShadow: '0 0 40px rgba(108,99,255,0.4)'
                } : {}}
                whileTap={canAdd ? { scale: 0.97 } : {}}
                onClick={() => canAdd && addToCart.mutate({ variantId: selectedVariant.id, quantity })}                
                disabled={!canAdd || addToCart.isLoading}
                style={{
                  flex: 1, minWidth: '200px',
                  background: canAdd
                    ? 'linear-gradient(135deg, #6C63FF, #A78BFA)'
                    : 'var(--bg-hover)',
                  border: 'none', borderRadius: '16px',
                  padding: '16px 32px',
                  color: canAdd ? 'white' : 'var(--text-muted)',
                  fontSize: '16px', fontWeight: 700,
                  cursor: canAdd ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px',
                }}
              >
                {addToCart.isLoading ? (
                  <Motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  >
                    ⟳
                  </Motion.span>
                ) : (
                  <>🛒 {canAdd ? t('products.add_to_cart') : t('products.out_of_stock')}</>
                )}
              </Motion.button>

              {/* Quick Buy */}
              {canAdd && (
                <Link to="/checkout" style={{ textDecoration: 'none', flex: 1, minWidth: '160px' }}>
                  <Motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addToCart.mutate({ variantId: selectedVariant.id, quantity })}                    
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid var(--border-hover)',
                      borderRadius: '16px', padding: '16px 24px',
                      color: 'var(--text-primary)', fontSize: '16px',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    ⚡ {isRTL ? 'اشتري الآن' : 'Buy Now'}
                  </Motion.button>
                </Link>
              )}
            </Motion.div>

            {/* Features */}
            <Motion.div variants={fadeUp} custom={7} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px', marginTop: '32px',
            }}>
              {[
                { icon: '🚚', label: isRTL ? 'شحن سريع' : 'Fast Delivery' },
                { icon: '↩️', label: isRTL ? 'إرجاع مجاني' : 'Free Returns' },
                { icon: '🔒', label: isRTL ? 'دفع آمن' : 'Secure Payment' },
              ].map((feat, i) => (
                <div key={i} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px', padding: '14px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{feat.icon}</div>
                  <div style={{
                    fontSize: '12px', fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}>
                    {feat.label}
                  </div>
                </div>
              ))}
            </Motion.div>

          </Motion.div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}