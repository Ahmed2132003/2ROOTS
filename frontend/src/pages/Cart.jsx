import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const FALLBACK_CART_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Crect width='240' height='240' fill='%23202439'/%3E%3Ctext x='50%25' y='50%25' fill='%239aa0c4' font-size='24' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'%3E📦%3C/text%3E%3C/svg%3E";

function resolveCartImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return FALLBACK_CART_IMAGE;
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return FALLBACK_CART_IMAGE;

  if (/^(https?:)?\/\//i.test(trimmedUrl) || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('blob:')) {
    return trimmedUrl;
  }

  const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim();
  const apiBaseUrl = api?.defaults?.baseURL || '';
  const absoluteBaseMatch = typeof apiBaseUrl === 'string' ? apiBaseUrl.match(/^https?:\/\/[^/]+/i) : null;
  const runtimeOrigin = 'http://localhost:8080';
  const apiOrigin = configuredOrigin || absoluteBaseMatch?.[0] || runtimeOrigin;
  const mediaBase = import.meta.env.VITE_MEDIA_BASE_URL || `${apiOrigin}/media/`;

  if (trimmedUrl.startsWith('/')) return `${apiOrigin}${trimmedUrl}`;
  return `${mediaBase.replace(/\/+$/, '')}/${trimmedUrl.replace(/^\/+/, '')}`;
}

function normalizeShippingRegions(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

// ─── Animation Variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }
  }),
};

// ─── Cart Item Row ─────────────────────────────────────────────────────────────
function CartItemRow({ item, index, t, isRTL, onUpdate, onRemove }) {
  const [qty, setQty]         = useState(item.quantity);
  const [removing, setRemoving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const productImage = item.variant?.product?.main_image || item.variant?.product?.image || item.image || '';
  const imageSrc = imageError ? FALLBACK_CART_IMAGE : resolveCartImageUrl(productImage);

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
      exit={{ opacity: 0, x: isRTL ? 60 : -60, transition: { duration: 0.3 } }}
      style={{
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: '20px',
        padding:      '20px',
        display:      'grid',
        gridTemplateColumns: '80px 1fr auto',
        gap:          '20px',
        alignItems:   'center',
        opacity:      removing ? 0.5 : 1,
        transition:   'opacity 0.3s',
      }}
    >
      {/* Image */}
      <Link to={`/products/${item.variant?.product?.slug || ''}`}>
        <div style={{
          width: '80px', height: '80px',
          borderRadius: '14px', overflow: 'hidden',
          background: 'var(--bg-hover)',
          flexShrink: 0,
        }}>
          {productImage ? (            
            <img
              src={imageSrc}              
              alt={item.variant?.product?.name}
              onError={() => setImageError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '32px',
            }}>📦</div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div>
        <div style={{
          fontSize: '11px', color: 'var(--accent)',
          fontWeight: 700, letterSpacing: '1.5px',
          marginBottom: '6px', textTransform: 'uppercase',
        }}>
          {item.variant?.product?.category?.name}
        </div>

        <Link to={`/products/${item.variant?.product?.slug || ''}`}
          style={{ textDecoration: 'none' }}>
          <div style={{
            fontWeight: 700, fontSize: '15px',
            color: 'var(--text-primary)', marginBottom: '4px',
            lineHeight: 1.3,
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
          >
            {item.variant?.product?.name}
          </div>
        </Link>

        <div style={{
          fontSize: '13px', color: 'var(--text-muted)',
          marginBottom: '12px',
        }}>
          {item.variant?.name}
        </div>

        {/* Quantity Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)', borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {[
              { label: '−', action: () => handleQty(qty - 1), disabled: qty <= 1 },
              { label: '+', action: () => handleQty(qty + 1), disabled: !item.is_available || qty >= item.variant?.stock?.quantity },
            ].map((btn, i) => (
                    <Motion.button                                        
                key={i}
                whileTap={{ scale: 0.85 }}
                onClick={btn.action}
                disabled={btn.disabled}
                style={{
                  width: '36px', height: '36px',
                  background: 'transparent', border: 'none',
                  color: btn.disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '18px', cursor: btn.disabled ? 'not-allowed' : 'pointer',
                  order: i === 0 ? 0 : 2,
                }}
              >
                {btn.label}
              </Motion.button>              
            ))}
            <div style={{
              width: '40px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)',
              borderLeft: '1px solid var(--border)',
              borderRight: '1px solid var(--border)',
              order: 1,
            }}>
              {qty}
            </div>
          </div>

          {/* Availability Warning */}
          {!item.is_available && (
            <Motion.span            
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                fontSize: '12px', color: 'var(--danger)',
                fontWeight: 700, background: 'rgba(239,68,68,0.1)',
                padding: '4px 10px', borderRadius: '8px',
              }}
            >
              ⚠ {t('products.out_of_stock')}
            </Motion.span>            
          )}
        </div>
      </div>

      {/* Price + Remove */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', gap: '12px',
      }}>
        <div style={{
          fontSize: '18px', fontWeight: 800,
          background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          whiteSpace: 'nowrap',
        }}>
          {Number(item.subtotal).toLocaleString()} {t('common.egp')}
        </div>

        <div style={{
          fontSize: '13px', color: 'var(--text-muted)',
          fontWeight: 500,
        }}>
          {Number(item.variant?.price).toLocaleString()} × {qty}
        </div>

              <Motion.button                 
          whileHover={{ scale: 1.1, color: 'var(--danger)' }}
          whileTap={{ scale: 0.9 }}
          onClick={handleRemove}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '10px', padding: '6px 12px',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--danger)';
            e.currentTarget.style.color       = 'var(--danger)';
            e.currentTarget.style.background  = 'rgba(239,68,68,0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color       = 'var(--text-muted)';
            e.currentTarget.style.background  = 'transparent';
          }}
        >
          🗑 {t('cart.remove')}
        </Motion.button>        
      </div>
    </Motion.div>    
  );
}

// ─── Empty Cart ────────────────────────────────────────────────────────────────
function EmptyCart({ t, isRTL }) {
  return (
    <Motion.div    
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        textAlign: 'center', padding: '80px 20px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '20px',
      }}
    >
      {/* Animated Cart Icon */}
    <Motion.div      
        animate={{ y: [0, -12, 0], rotate: [0, -5, 5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: '80px' }}
      >
        🛒
      </Motion.div>
      <div style={{
        fontSize: '28px', fontWeight: 800,
        color: 'var(--text-primary)',
        fontFamily: "'Syne', 'Cairo', sans-serif",
      }}>
        {t('cart.empty')}
      </div>

      <p style={{
        color: 'var(--text-muted)', fontSize: '16px',
        maxWidth: '320px', lineHeight: 1.7,
      }}>
        {isRTL
          ? 'لم تضف أي منتجات بعد. تصفح منتجاتنا وأضف ما يعجبك!'
          : "You haven't added anything yet. Browse our products!"}
      </p>

      <Link to="/products" style={{ textDecoration: 'none' }}>
              <Motion.button                     
          whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(108,99,255,0.3)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
            border: 'none', borderRadius: '16px',
            padding: '14px 36px',
            color: 'white', fontSize: '16px', fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('cart.continue')} →
        </Motion.button>        
      </Link>
    </Motion.div>    
  );
}

// ─── Order Summary ─────────────────────────────────────────────────────────────
function OrderSummary({ cart, t, isRTL, onCheckout, isLoading, regions, selectedRegionId, onSelectRegion, regionsError }) {
  const total = Number(cart?.total_price || 0);
  const selectedRegion = (regions || []).find((r) => String(r.id) === String(selectedRegionId));
  const shipping = selectedRegion ? Number(selectedRegion.price) : 0;
  const grand = total + shipping;

  return (
    <Motion.div    
      initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      style={{
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: '24px', padding: '28px',
        position:     'sticky', top: '90px',
      }}
    >
      <h2 style={{
        fontWeight: 800, fontSize: '20px',
        color: 'var(--text-primary)', marginBottom: '28px',
        fontFamily: "'Syne', 'Cairo', sans-serif",
      }}>
        {isRTL ? 'ملخص الطلب' : 'Order Summary'}
      </h2>

      {/* Lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        {[
          {
            label: isRTL ? 'المجموع الفرعي' : 'Subtotal',
            value: `${Number(total).toLocaleString()} ${t('common.egp')}`,
          },
          {
            label: isRTL ? 'الشحن' : 'Shipping',
            value: shipping === 0
              ? (isRTL ? 'مجاني 🎉' : 'Free 🎉')
              : `${shipping} ${t('common.egp')}`,
            highlight: shipping === 0,
          },
        ].map((line, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              {line.label}
            </span>
            <span style={{
              fontWeight: 700, fontSize: '15px',
              color: line.highlight ? 'var(--success)' : 'var(--text-primary)',
            }}>
              {line.value}
            </span>
          </div>
        ))}

        {/* Free Shipping Progress */}
        {!selectedRegion && <div style={{fontSize:'12px',color:'var(--danger)'}}>{isRTL ? 'اختر المحافظة لحساب الشحن' : 'Select governorate to calculate shipping.'}</div>}
        {shipping > 0 && (
          <div>
            <div style={{
              fontSize: '12px', color: 'var(--text-muted)',
              marginBottom: '8px',
            }}>
              {isRTL
                ? `أضف ${(500 - total).toLocaleString()} ج.م للشحن المجاني`
                : `Add ${(500 - total).toLocaleString()} EGP for free shipping`}
            </div>
            <div style={{
              height: '6px', background: 'var(--bg-hover)',
              borderRadius: '3px', overflow: 'hidden',
            }}>
              <Motion.div              
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((total / 500) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #6C63FF, #A78BFA)',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>
              {t('cart.total')}
            </span>
            <span style={{
              fontWeight: 800, fontSize: '22px',
              background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {Number(grand).toLocaleString()} {t('common.egp')}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}><select className="orders-input" value={selectedRegionId || ''} onChange={(e) => onSelectRegion(e.target.value)}><option value="">{isRTL ? 'اختر المحافظة' : 'Select Governorate'}</option>{(regions || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>{regionsError && <div style={{ fontSize: '12px', color: 'var(--danger)' }}>{isRTL ? 'تعذر تحميل المحافظات' : 'Failed to load governorates.'}</div>}</div>
      {/* Checkout Button */}
            <Motion.button             
        whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(108,99,255,0.4)' }}
        whileTap={{ scale: 0.97 }}
        onClick={onCheckout}
        disabled={isLoading || !selectedRegion}        
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
          border: 'none', borderRadius: '16px',
          padding: '16px',
          color: 'white', fontSize: '16px', fontWeight: 700,
          cursor: 'pointer', marginBottom: '12px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px',
        }}
      >
        {isLoading ? (
          <Motion.span          
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          >⟳</Motion.span>          
        ) : (
          <>{t('cart.checkout')} →</>
        )}
      </Motion.button>

      {/* Continue Shopping */}
      <Link to="/products" style={{ textDecoration: 'none' }}>
              <Motion.button

          whileHover={{ scale: 1.02 }}
          style={{
            width: '100%', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: '16px',
            padding: '14px', color: 'var(--text-secondary)',
            fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t('cart.continue')}
        </Motion.button>        
      </Link>

      {/* Trust Badges */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '20px',
        marginTop: '24px', paddingTop: '24px',
        borderTop: '1px solid var(--border)',
      }}>
        {['🔒 Secure', '↩️ Returns', '🚚 Fast'].map((badge, i) => (
          <div key={i} style={{
            fontSize: '12px', color: 'var(--text-muted)',
            fontWeight: 600, textAlign: 'center',
          }}>
            {badge}
          </div>
        ))}
      </div>
    </Motion.div>    
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function CartSkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 340px',
      gap: '32px', alignItems: 'start',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[...Array(3)].map((_, i) => (
          <Motion.div key={i}          
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            style={{
              height: '120px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: '20px',
            }}
          />
        ))}
      </div>
      <Motion.div      
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          height: '360px', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: '24px',
        }}
      />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Cart() {
  const { t, i18n }  = useTranslation();
  const isRTL        = i18n.language === 'ar';
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  // Fetch Cart
  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn:  () => api.get('/cart/').then(r => r.data),
  });

  // Update Item
  const updateItem = useMutation({
    mutationFn: ({ id, quantity }) =>
      api.patch(`/cart/item/${id}/`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries(['cart']),
  });

  // Remove Item
  const removeItem = useMutation({
    mutationFn: (id) => api.delete(`/cart/item/${id}/`),
    onSuccess:  () => queryClient.invalidateQueries(['cart']),
  });

  // Clear Cart
  const clearCart = useMutation({
    mutationFn: () => api.delete('/cart/clear/'),
    onSuccess:  () => queryClient.invalidateQueries(['cart']),
  });

  const handleCheckout = () => navigate('/checkout');
  const [selectedRegionId, setSelectedRegionId] = useState(() => localStorage.getItem('selected_shipping_region') || '');
  const { data: regionsData, isError: regionsError } = useQuery({
    queryKey: ['shipping-regions'],
    queryFn: () => api.get('/orders/shipping-regions/').then((r) => r.data),
  });
  const regions = normalizeShippingRegions(regionsData);  
  useEffect(() => { localStorage.setItem('selected_shipping_region', selectedRegionId); }, [selectedRegionId]);

  const items = cart?.items || [];

  return (
    <div style={{ minHeight: '100vh', padding: '40px 5%' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <Motion.div        
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '40px', flexWrap: 'wrap', gap: '16px',
          }}
        >
          <div>
            <div style={{
              fontSize: '11px', color: 'var(--accent)',
              fontWeight: 700, letterSpacing: '3px',
              marginBottom: '8px', textTransform: 'uppercase',
            }}>
              ✦ {t('nav.cart')}
            </div>
            <h1 style={{
              fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: "'Syne', 'Cairo', sans-serif",
            }}>
              {t('cart.title')}
              {items.length > 0 && (
                <span style={{
                  fontSize: '18px', fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginInlineStart: '12px',
                }}>
                  ({items.length})
                </span>
              )}
            </h1>
          </div>

          {/* Clear Cart */}
          {items.length > 0 && (
                  <Motion.button                                   
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => clearCart.mutate()}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '12px', padding: '10px 20px',
                color: 'var(--text-muted)', cursor: 'pointer',
                fontWeight: 600, fontSize: '14px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--danger)';
                e.currentTarget.style.color       = 'var(--danger)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color       = 'var(--text-muted)';
              }}
            >
              🗑 {isRTL ? 'مسح الكل' : 'Clear All'}
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

            {/* Items List */}
            <Motion.div            
              initial="hidden"
              animate="visible"
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}              
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

              {/* Unavailable Warning */}
              {items.some(i => !i.is_available) && (
                <Motion.div                
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '16px', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    color: 'var(--danger)', fontSize: '14px', fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: '20px' }}>⚠️</span>
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