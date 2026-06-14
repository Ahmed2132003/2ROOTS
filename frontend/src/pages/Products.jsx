import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { getPreferredCartVariant, useAddToCartMutation } from '../hooks/useCartActions';

/* ─── Design Tokens ────────────────────────────────────────────────────────── */
const TOKENS = {
  bg:          '#0A0A0A',
  bgCard:      '#111111',
  bgHover:     '#1A1A1A',
  border:      'rgba(216,210,194,0.12)',
  borderHover: 'rgba(184,155,94,0.5)',
  textPrimary: '#FFFFFF',
  textSecond:  '#D9D9D9',
  textMuted:   'rgba(217,217,217,0.45)',
  stone:       '#D8D2C2',
  gold:        '#B89B5E',
  goldGlow:    'rgba(184,155,94,0.10)',
  green:       '#2F4F3E',
  success:     '#4CAF50',
};

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const DEFAULT_FILTERS = {
  category:  '',
  min_price: '',
  max_price: '',
  in_stock:  false,
  search:    '',
  ordering:  '-created_at',
};

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%230A0A0A'/%3E%3Ctext x='50%25' y='50%25' fill='%23D8D2C2' font-size='28' text-anchor='middle' dominant-baseline='middle' font-family='Arial,sans-serif' letter-spacing='4'%3ENO IMAGE%3C/text%3E%3C/svg%3E";

/* ─── Image resolver ─────────────────────────────────────────────────────────── */
function resolveProductImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return FALLBACK_IMAGE;
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(trimmedUrl) || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('blob:'))
    return trimmedUrl;
  const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim();
  const apiBaseUrl = typeof api?.defaults?.baseURL === 'string' ? api.defaults.baseURL : '';
  const absoluteBaseMatch = apiBaseUrl.match(/^https?:\/\/[^/]+/i);
  const backendOrigin = configuredOrigin || absoluteBaseMatch?.[0] || 'http://localhost:8080';
  const mediaBase = import.meta.env.VITE_MEDIA_BASE_URL || `${backendOrigin}/media/`;
  if (trimmedUrl.startsWith('/')) return `${backendOrigin}${trimmedUrl}`;
  return `${mediaBase.replace(/\/+$/, '')}/${trimmedUrl.replace(/^\/+/, '')}`;
}

/* ─── Motion variants ────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] },
  }),
};
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.055 } },
};

/* ══════════════════════════════════════════════════════════════════════════════
   PRODUCT CARD — same image treatment as Home.jsx
══════════════════════════════════════════════════════════════════════════════ */
function ProductCard({ product, index, t, onAddToCart }) {
  const [adding,     setAdding]     = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hovered,    setHovered]    = useState(false);

  const preferredImage = useMemo(() => {
    if (Array.isArray(product?.images) && product.images.length > 0)
      return product.images.find(img => img?.is_main)?.image || product.images[0]?.image;
    return product?.main_image || product?.image || product?.imageUrl || '';
  }, [product]);

  const imageSrc   = useMemo(() => imageError ? FALLBACK_IMAGE : resolveProductImageUrl(preferredImage), [imageError, preferredImage]);
  const isSoldOut  = product.is_sold_out || product.stock_status === 'sold_out' || !product.in_stock;
  const hasDiscount = product.discount_is_active && product.discounted_price != null;
  const discountPct = Number(product.discount_percentage || 0);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut || adding) return;
    setAdding(true);
    await onAddToCart(product);
    setTimeout(() => setAdding(false), 900);
  };

  return (
    <Motion.div
      layout
      variants={fadeUp}
      custom={index}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -6, borderColor: TOKENS.borderHover }}
      style={{
        background:    TOKENS.bgCard,
        border:        `1px solid ${TOKENS.border}`,
        borderRadius:  '4px',
        overflow:      'hidden',
        position:      'relative',
        transition:    'border-color 0.35s ease',
        cursor:        'pointer',
        opacity:       isSoldOut ? 0.75 : 1,
      }}
    >
      <Link to={`/products/${product.slug}`} style={{ textDecoration: 'none', display: 'block' }}>

        {/* ── Image — full natural height, no crop ── */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {preferredImage ? (
            <Motion.img
              src={imageSrc}
              alt={product.name}
              animate={{ scale: hovered ? 1.06 : 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              onError={() => setImageError(true)}
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
              background: TOKENS.bgHover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '48px', opacity: 0.2,
            }}>
              🌳
            </div>
          )}

          {/* Dark vignette on hover */}
          <Motion.div
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />

          {/* Featured badge */}
          {product.is_featured && (
            <div style={{
              position: 'absolute', top: '12px', left: '12px',
              background: TOKENS.green,
              color: TOKENS.stone,
              borderRadius: '2px',
              padding: '4px 10px',
              fontSize: '10px',
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: '2px',
            }}>
              FEATURED
            </div>
          )}

          {/* Discount badge */}
          {hasDiscount && !isSoldOut && (
            <div style={{
              position: 'absolute',
              top: product.is_featured ? '40px' : '12px',
              left: '12px',
              background: '#B91C1C',
              color: '#fff',
              borderRadius: '2px',
              padding: '4px 10px',
              fontSize: '11px',
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: '1.5px',
            }}>
              -{discountPct}%
            </div>
          )}

          {/* Sold out overlay */}
          {isSoldOut && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                color: TOKENS.stone,
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '18px',
                letterSpacing: '4px',
              }}>
                {t('products.out_of_stock')}
              </span>
            </div>
          )}

          {/* Quick-add button */}
          {!isSoldOut && (
            <Motion.button
              onClick={handleAdd}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: hovered ? 0 : 20, opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.95 }}
              style={{
                position: 'absolute',
                bottom: '12px', left: '12px', right: '12px',
                background: adding ? TOKENS.green : TOKENS.textPrimary,
                border: 'none',
                borderRadius: '2px',
                padding: '12px',
                color: adding ? TOKENS.stone : '#0A0A0A',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '14px',
                letterSpacing: '3px',
                cursor: 'pointer',
                transition: 'background 0.3s',
              }}
            >
              {adding ? '✓ ADDED' : 'ADD TO CART'}
            </Motion.button>
          )}
        </div>

        {/* ── Info ── */}
        <div style={{ padding: '16px 16px 20px' }}>
          <div style={{
            fontSize: '10px',
            color: TOKENS.textMuted,
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: '3px',
            marginBottom: '6px',
            textTransform: 'uppercase',
          }}>
            {product.category?.name}
          </div>

          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: '14px',
            color: TOKENS.textSecond,
            marginBottom: '14px',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            letterSpacing: '0.2px',
          }}>
            {product.name}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '22px',
              letterSpacing: '1px',
              color: hasDiscount ? TOKENS.gold : TOKENS.textPrimary,
              lineHeight: 1,
            }}>
              {hasDiscount
                ? Number(product.discounted_price).toLocaleString()
                : Number(product.base_price).toLocaleString()}{' '}
              <span style={{ fontSize: '13px', letterSpacing: '2px', color: TOKENS.textMuted }}>
                {t('common.egp')}
              </span>
            </span>

            {hasDiscount && (
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                color: TOKENS.textMuted,
                textDecoration: 'line-through',
                fontWeight: 400,
              }}>
                {Number(product.base_price).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </Link>
    </Motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SKELETON CARD
══════════════════════════════════════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <Motion.div
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        background:   TOKENS.bgCard,
        border:       `1px solid ${TOKENS.border}`,
        borderRadius: '4px',
        overflow:     'hidden',
      }}
    >
      <div style={{ aspectRatio: '3/4', background: TOKENS.bgHover }} />
      <div style={{ padding: '16px' }}>
        {[35, 75, 45].map((w, i) => (
          <div key={i} style={{
            height: i === 1 ? '14px' : '11px',
            width: `${w}%`,
            background: TOKENS.bgHover,
            borderRadius: '2px',
            marginBottom: i < 2 ? '10px' : 0,
          }} />
        ))}
      </div>
    </Motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   FILTER PANEL
══════════════════════════════════════════════════════════════════════════════ */
function FilterPanel({ filters, setFilters, categories, t, isRTL, onClose, isMobile }) {
  const categoryList = Array.isArray(categories)
    ? categories
    : Array.isArray(categories?.results)
      ? categories.results
      : [];

  const inputStyle = {
    flex: 1,
    background: TOKENS.bg,
    border: `1px solid ${TOKENS.border}`,
    borderRadius: '2px',
    padding: '9px 12px',
    color: TOKENS.textPrimary,
    fontSize: '13px',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  };

  const content = (
    <div style={{
      background:   isMobile ? '#0D0D0D' : TOKENS.bgCard,
      border:       `1px solid ${TOKENS.border}`,
      borderRadius: isMobile ? '12px 12px 0 0' : '4px',
      padding:      '28px 24px',
      position:     isMobile ? 'fixed' : 'sticky',
      bottom:       isMobile ? 0 : 'auto',
      left:         isMobile ? 0 : 'auto',
      right:        isMobile ? 0 : 'auto',
      top:          isMobile ? 'auto' : '90px',
      zIndex:       isMobile ? 200 : 1,
      maxHeight:    isMobile ? '80vh' : 'calc(100vh - 110px)',
      overflowY:    'auto',
      width:        '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '20px',
          letterSpacing: '4px',
          color: TOKENS.textPrimary,
        }}>
          {t('products.filter')}
        </div>
        {isMobile && (
          <button onClick={onClose} style={{
            background: TOKENS.bgHover, border: `1px solid ${TOKENS.border}`,
            borderRadius: '2px', padding: '6px 12px',
            color: TOKENS.textSecond, cursor: 'pointer', fontSize: '16px',
          }}>✕</button>
        )}
      </div>

      {/* Categories */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '12px', letterSpacing: '3px',
          color: TOKENS.textMuted, marginBottom: '14px',
        }}>
          {t('home.categories')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[{ slug: '', name: isRTL ? 'الكل' : 'ALL' }, ...categoryList].map((cat) => {
            const active = filters.category === cat.slug;
            return (
              <Motion.button
                key={cat.slug || 'all'}
                whileHover={{ x: isRTL ? -3 : 3 }}
                onClick={() => setFilters(f => ({ ...f, category: cat.slug }))}
                style={{
                  background:  active ? TOKENS.goldGlow : 'transparent',
                  border:      `1px solid ${active ? TOKENS.gold : 'transparent'}`,
                  borderRadius: '2px',
                  padding:     '9px 12px',
                  color:       active ? TOKENS.gold : TOKENS.textSecond,
                  cursor:      'pointer',
                  fontFamily:  "'Inter', sans-serif",
                  fontWeight:  active ? 600 : 400,
                  fontSize:    '13px',
                  textAlign:   isRTL ? 'right' : 'left',
                  width:       '100%',
                  letterSpacing: active ? '0.5px' : 0,
                  transition:  'all 0.2s',
                }}
              >
                {active && (
                  <span style={{ marginRight: isRTL ? 0 : '8px', marginLeft: isRTL ? '8px' : 0, color: TOKENS.gold }}>—</span>
                )}
                {cat.name}
              </Motion.button>
            );
          })}
        </div>
      </div>

      <div style={{ height: '1px', background: TOKENS.border, marginBottom: '32px' }} />

      {/* Price */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '12px', letterSpacing: '3px',
          color: TOKENS.textMuted, marginBottom: '14px',
        }}>
          {t('products.price')}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'min_price', placeholder: isRTL ? 'من' : 'MIN' },
            { key: 'max_price', placeholder: isRTL ? 'إلى' : 'MAX' },
          ].map(({ key, placeholder }) => (
            <input
              key={key}
              type="number"
              placeholder={placeholder}
              value={filters[key]}
              onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
              style={inputStyle}
              onFocus={e  => { e.target.style.borderColor = TOKENS.gold; }}
              onBlur={e   => { e.target.style.borderColor = TOKENS.border; }}
            />
          ))}
        </div>
      </div>

      <div style={{ height: '1px', background: TOKENS.border, marginBottom: '32px' }} />

      {/* In stock */}
      <div style={{ marginBottom: '32px' }}>
        <Motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setFilters(f => ({ ...f, in_stock: !f.in_stock }))}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            width: '100%', padding: 0,
          }}
        >
          <div style={{
            width: '18px', height: '18px',
            background:   filters.in_stock ? TOKENS.gold : 'transparent',
            border:       `1.5px solid ${filters.in_stock ? TOKENS.gold : TOKENS.border}`,
            borderRadius: '2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.2s',
          }}>
            {filters.in_stock && (
              <Motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{ color: '#0A0A0A', fontSize: '11px', fontWeight: 700 }}>✓</Motion.span>
            )}
          </div>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            color: TOKENS.textSecond, fontWeight: 400, fontSize: '13px',
          }}>
            {t('products.in_stock')}
          </span>
        </Motion.button>
      </div>

      {/* Reset */}
      <Motion.button
        whileHover={{ borderColor: TOKENS.stone }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setFilters(DEFAULT_FILTERS)}
        style={{
          width: '100%',
          background:   'transparent',
          border:       `1px solid ${TOKENS.border}`,
          borderRadius: '2px',
          padding:      '11px',
          color:        TOKENS.textMuted,
          cursor:       'pointer',
          fontFamily:   "'Bebas Neue', sans-serif",
          fontSize:     '13px',
          letterSpacing: '2px',
          transition:   'border-color 0.2s, color 0.2s',
        }}
      >
        {isRTL ? 'إعادة الضبط' : 'RESET FILTERS'}
      </Motion.button>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        <Motion.div
          key="overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 199 }}
        />
        <Motion.div
          key="panel"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200 }}
        >
          {content}
        </Motion.div>
      </AnimatePresence>
    );
  }

  return content;
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function Products() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const t = (key) => {
    const map = {
      'products.out_of_stock': isRTL ? 'نفد المخزون' : 'OUT OF STOCK',
      'common.egp':            isRTL ? 'ج.م' : 'EGP',
      'products.filter':       isRTL ? 'الفلاتر' : 'FILTERS',
      'home.categories':       isRTL ? 'التصنيفات' : 'CATEGORIES',
      'products.price':        isRTL ? 'السعر' : 'PRICE',
      'products.in_stock':     isRTL ? 'المتوفر فقط' : 'In stock only',
      'nav.products':          isRTL ? 'المنتجات' : 'COLLECTION',
      'products.title':        isRTL ? 'كل المنتجات' : 'ALL PRODUCTS',
      'products.search':       isRTL ? 'ابحث عن منتجات...' : 'Search products...',
      'products.no_products':  isRTL ? 'لا توجد منتجات' : 'NO PRODUCTS FOUND',
    };
    return map[key] ?? key;
  };

  const [searchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < 1024);

  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    category: searchParams.get('category') || '',
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.category)  p.set('category',  filters.category);
    if (filters.min_price) p.set('min_price',  filters.min_price);
    if (filters.max_price) p.set('max_price',  filters.max_price);
    if (filters.in_stock)  p.set('in_stock',   'true');
    if (filters.search)    p.set('search',     filters.search);
    if (filters.ordering)  p.set('ordering',   filters.ordering);
    return p.toString();
  }, [filters]);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn:  () => api.get(`/products/items/?${queryParams}`).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/products/').then(r => r.data),
  });

  const addToCart = useAddToCartMutation();
  const handleAddToCart = async (product) => {
    const variant = getPreferredCartVariant(product);
    if (!variant?.id) return;
    try {
      await addToCart.mutateAsync({ variantId: variant.id, quantity: 1 });
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const products = productsData?.results || productsData || [];
  const sortOptions = [
    { value: '-created_at', label: isRTL ? 'الأحدث' : 'NEWEST' },
    { value: 'base_price',  label: isRTL ? 'السعر: الأقل' : 'PRICE: LOW' },
    { value: '-base_price', label: isRTL ? 'السعر: الأعلى' : 'PRICE: HIGH' },
  ];

  const controlBase = {
    background:   TOKENS.bgCard,
    border:       `1px solid ${TOKENS.border}`,
    borderRadius: '2px',
    color:        TOKENS.textPrimary,
    fontSize:     '13px',
    outline:      'none',
    fontFamily:   "'Inter', sans-serif",
  };

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.bg, paddingTop: '40px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 5%' }}>

        {/* ── Page header ── */}
        <Motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: '48px' }}
        >
          <div style={{
            fontFamily:    "'Bebas Neue', sans-serif",
            fontSize:      '12px',
            color:         TOKENS.stone,
            letterSpacing: '5px',
            marginBottom:  '12px',
          }}>
            ✦ {t('nav.products')}
          </div>

          <h1 style={{
            fontFamily:    "'Bebas Neue', sans-serif",
            fontSize:      'clamp(40px, 7vw, 80px)',
            fontWeight:    400,
            color:         TOKENS.textPrimary,
            lineHeight:    0.95,
            letterSpacing: '3px',
            margin:        0,
          }}>
            {t('products.title')}
          </h1>
        </Motion.div>

        {/* ── Search + Sort toolbar ── */}
        <Motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display:       'flex',
            gap:           '10px',
            marginBottom:  '40px',
            flexWrap:      'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <span style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              [isRTL ? 'right' : 'left']: '14px',
              color: TOKENS.textMuted, fontSize: '14px', pointerEvents: 'none',
            }}>
              ⌕
            </span>
            <input
              type="text"
              placeholder={t('products.search')}
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              onFocus={e  => { e.target.style.borderColor = TOKENS.stone; }}
              onBlur={e   => { e.target.style.borderColor = TOKENS.border; }}
              style={{
                ...controlBase,
                width:   '100%',
                padding: isRTL ? '13px 42px 13px 14px' : '13px 14px 13px 42px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          <select
            value={filters.ordering}
            onChange={e => setFilters(f => ({ ...f, ordering: e.target.value }))}
            style={{
              ...controlBase,
              padding:   '13px 20px',
              minWidth:  '160px',
              cursor:    'pointer',
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: '1.5px',
            }}
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value} style={{ background: TOKENS.bgCard }}>
                {opt.label}
              </option>
            ))}
          </select>

          {isMobile && (
            <Motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setFilterOpen(true)}
              style={{
                ...controlBase,
                padding:  '13px 20px',
                cursor:   'pointer',
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: '2px',
                border:  `1px solid ${TOKENS.stone}`,
                color:   TOKENS.stone,
              }}
            >
              ☰ {t('products.filter')}
            </Motion.button>
          )}
        </Motion.div>

        {/* ── Two-column layout ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: isMobile ? '1fr' : '220px 1fr',
          gap:                 '40px',
          alignItems:          'start',
        }}>
          {!isMobile && !isRTL && (
            <FilterPanel filters={filters} setFilters={setFilters}
              categories={categories} t={t} isRTL={isRTL} />
          )}

          <div>
            <div style={{
              fontFamily:   "'Bebas Neue', sans-serif",
              color:        TOKENS.textMuted,
              fontSize:     '12px',
              letterSpacing: '3px',
              marginBottom: '24px',
            }}>
              {isLoading ? '—' : `${products.length} ${isRTL ? 'منتج' : 'PRODUCTS'}`}
            </div>

            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>

            ) : products.length === 0 ? (
              <Motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '100px 20px' }}
              >
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '64px', letterSpacing: '4px',
                  color: TOKENS.textMuted, marginBottom: '16px',
                }}>
                  {t('products.no_products')}
                </div>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  color: TOKENS.textMuted, fontSize: '14px', marginBottom: '32px',
                }}>
                  {isRTL ? 'جرّب تعديل الفلتر' : 'Try adjusting your filters.'}
                </div>
                <Motion.button
                  whileHover={{ borderColor: TOKENS.stone, color: TOKENS.stone }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  style={{
                    background:   'transparent',
                    border:       `1px solid ${TOKENS.border}`,
                    borderRadius: '2px',
                    padding:      '13px 32px',
                    color:        TOKENS.textMuted,
                    cursor:       'pointer',
                    fontFamily:   "'Bebas Neue', sans-serif",
                    fontSize:     '13px',
                    letterSpacing: '3px',
                    transition:   'all 0.2s',
                  }}
                >
                  {isRTL ? 'إعادة الضبط' : 'RESET FILTERS'}
                </Motion.button>
              </Motion.div>

            ) : (
              <Motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}
              >
                <AnimatePresence>
                  {products.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={i}
                      t={t}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </AnimatePresence>
              </Motion.div>
            )}
          </div>

          {!isMobile && isRTL && (
            <FilterPanel filters={filters} setFilters={setFilters}
              categories={categories} t={t} isRTL={isRTL} />
          )}
        </div>
      </div>

      {isMobile && filterOpen && (
        <FilterPanel
          filters={filters} setFilters={setFilters}
          categories={categories} t={t} isRTL={isRTL}
          onClose={() => setFilterOpen(false)}
          isMobile
        />
      )}
    </div>
  );
}