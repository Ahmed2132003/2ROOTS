import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { getPreferredCartVariant, useAddToCartMutation } from '../hooks/useCartActions';

// ─── Animation Variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23181818'/%3E%3Ctext x='50%25' y='50%25' fill='%23555' font-size='28' text-anchor='middle' dominant-baseline='middle' font-family='Arial'%3ENO IMAGE%3C/text%3E%3C/svg%3E";

function resolveProductImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return FALLBACK_IMAGE;
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return FALLBACK_IMAGE;
  if (/^(https?:)?\/\//i.test(trimmedUrl) || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('blob:')) return trimmedUrl;
  const configuredOrigin  = import.meta.env.VITE_API_ORIGIN?.trim();
  const apiBaseUrl        = api?.defaults?.baseURL || '';
  const absoluteBaseMatch = typeof apiBaseUrl === 'string' ? apiBaseUrl.match(/^https?:\/\/[^/]+/i) : null;
  const runtimeOrigin     = 'http://localhost:8080';
  const apiOrigin         = configuredOrigin || absoluteBaseMatch?.[0] || runtimeOrigin;
  const mediaBase         = import.meta.env.VITE_MEDIA_BASE_URL || `${apiOrigin}/media/`;
  if (trimmedUrl.startsWith('/media/') || trimmedUrl.startsWith('/')) return `${apiOrigin}${trimmedUrl}`;
  return `${mediaBase.replace(/\/+$/, '')}/${trimmedUrl.replace(/^\/+/, '')}`;
}

// ══════════════════════════════════════════════════════════════
// HERO SECTION
// ══════════════════════════════════════════════════════════════
function HeroSection({ t, isRTL }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const y       = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} style={{
      minHeight:  '100vh',
      display:    'flex',
      alignItems: 'center',
      position:   'relative',
      overflow:   'hidden',
      padding:    '0 clamp(20px,5vw,80px)',
      background: 'var(--black)',
    }}>

      {/* ── Grain texture overlay ── */}
      <div style={{
        position:   'absolute',
        inset:       0,
        zIndex:      1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
        pointerEvents:  'none',
        opacity: 0.6,
      }} />

      {/* ── Subtle top gradient ── */}
      <div style={{
        position:   'absolute',
        inset:       0,
        zIndex:      0,
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(216,210,194,0.04) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* ── Vertical rule lines ── */}
      {[15, 40, 60, 85].map((x, i) => (
        <div key={i} style={{
          position:    'absolute',
          top:          0, bottom: 0,
          left:        `${x}%`,
          width:        '1px',
          background:  'rgba(255,255,255,0.025)',
          zIndex:       0,
          pointerEvents:'none',
        }} />
      ))}

      {/* ── Content ── */}
      <Motion.div style={{
        y, opacity,
        position:   'relative',
        zIndex:      2,
        maxWidth:   '1400px',
        margin:     '0 auto',
        width:      '100%',
        paddingBlock:'120px 80px',
      }}>
        <Motion.div variants={stagger} initial="hidden" animate="visible">

          {/* Eyebrow */}
          <Motion.div variants={fadeUp} custom={0} style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:             '10px',
            marginBottom:   '32px',
          }}>
            <span style={{
              display:       'block',
              width:          '28px',
              height:         '1px',
              background:    'var(--stone-muted)',
            }} />
            <span style={{
              fontFamily:    'var(--font-body)',
              fontSize:       '11px',
              fontWeight:     600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color:         'var(--stone-muted)',
            }}>
              New Season
            </span>
          </Motion.div>

          {/* Main headline */}
          <Motion.h1 variants={fadeUp} custom={1} style={{
            fontFamily:    'var(--font-display)',
            fontSize:      'clamp(64px, 11vw, 140px)',
            lineHeight:     0.9,
            letterSpacing: '0.02em',
            color:         'var(--white)',
            textTransform: 'uppercase',
            marginBottom:  '8px',
          }}>
            2ROOTS
          </Motion.h1>

          {/* Tagline */}
          <Motion.div variants={fadeUp} custom={2} style={{
            fontFamily:    'var(--font-body)',
            fontSize:      'clamp(12px, 1.4vw, 15px)',
            fontWeight:     500,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:         'var(--stone-muted)',
            marginBottom:  '56px',
          }}>
            {isRTL
              ? 'جذور في الكفاح · بُني للعظمة'
              : 'ROOTED IN STRUGGLE · BUILT FOR GREATNESS'}
          </Motion.div>

          {/* CTAs */}
          <Motion.div variants={fadeUp} custom={3} style={{
            display:   'flex',
            gap:        '12px',
            flexWrap:  'wrap',
          }}>
            <Link to="/products" style={{ textDecoration: 'none' }}>
              <Motion.button
                whileHover={{ backgroundColor: 'var(--stone)', boxShadow: '0 0 32px rgba(184,155,94,0.15)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background:    'var(--white)',
                  border:        '1px solid var(--white)',
                  borderRadius:  'var(--radius-sm)',
                  padding:       '14px 36px',
                  color:         'var(--black)',
                  fontFamily:    'var(--font-body)',
                  fontSize:       '12px',
                  fontWeight:     700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor:        'pointer',
                  transition:    'background 0.25s, border-color 0.25s, box-shadow 0.25s',
                }}
              >
                {isRTL ? 'تسوق الآن' : 'SHOP NOW'}
              </Motion.button>
            </Link>

            <Link to="/products" style={{ textDecoration: 'none' }}>
              <Motion.button
                whileHover={{ borderColor: 'var(--stone)', color: 'var(--stone)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background:    'transparent',
                  border:        '1px solid var(--border-strong)',
                  borderRadius:  'var(--radius-sm)',
                  padding:       '14px 36px',
                  color:         'var(--text-secondary)',
                  fontFamily:    'var(--font-body)',
                  fontSize:       '12px',
                  fontWeight:     600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor:        'pointer',
                  transition:    'border-color 0.25s, color 0.25s',
                }}
              >
                {isRTL ? 'عرض الكل' : 'EXPLORE'}
              </Motion.button>
            </Link>
          </Motion.div>

          {/* Stats */}
          <Motion.div variants={fadeUp} custom={4} style={{
            display:       'flex',
            gap:            'clamp(32px, 5vw, 72px)',
            marginTop:     '80px',
            paddingTop:    '40px',
            borderTop:     '1px solid var(--border)',
            flexWrap:      'wrap',
          }}>
            {[
              { num: '10K+', label: isRTL ? 'عميل' : 'CUSTOMERS' },
              { num: '500+', label: isRTL ? 'منتج' : 'PRODUCTS'  },
              { num: '99%',  label: isRTL ? 'رضا'  : 'SATISFIED' },
            ].map((stat, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{
                  fontFamily:    'var(--font-display)',
                  fontSize:      'clamp(28px, 4vw, 40px)',
                  color:         'var(--white)',
                  lineHeight:     1,
                  letterSpacing: '0.02em',
                }}>
                  {stat.num}
                </span>
                <span style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:       '10px',
                  fontWeight:     600,
                  letterSpacing: '0.18em',
                  color:         'var(--stone-muted)',
                  textTransform: 'uppercase',
                }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </Motion.div>

        </Motion.div>
      </Motion.div>

      {/* ── Scroll indicator ── */}
      <Motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position:  'absolute',
          bottom:    '36px',
          left:      '50%',
          transform: 'translateX(-50%)',
          zIndex:     2,
          display:   'flex',
          flexDirection: 'column',
          alignItems:'center',
          gap:        '6px',
        }}
      >
        <span style={{
          fontSize:       '10px',
          letterSpacing: '0.16em',
          color:         'var(--stone-muted)',
          textTransform: 'uppercase',
          fontWeight:     500,
        }}>
          Scroll
        </span>
        <div style={{
          width:         '1px',
          height:        '36px',
          background:    'linear-gradient(to bottom, var(--stone-muted), transparent)',
        }} />
      </Motion.div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// CATEGORY CARD
// ══════════════════════════════════════════════════════════════
function CategoryCard({ cat, index }) {
  const [imgError, setImgError] = useState(false);
  const categoryImage   = resolveProductImageUrl(cat?.image_url || cat?.image || '');
  const showCatImage    = Boolean(categoryImage) && !imgError && categoryImage !== FALLBACK_IMAGE;

  return (
    <Motion.div
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -4 }}
      style={{
        background:    'var(--bg-card)',
        border:        '1px solid var(--border)',
        borderRadius:  'var(--radius-md)',
        overflow:      'hidden',
        cursor:        'pointer',
        position:      'relative',
        aspectRatio:   '1',
        transition:    'border-color 0.25s',
      }}
      onHoverStart={(e) => { e.target.style && (e.target.style.borderColor = 'var(--border-strong)'); }}
    >
      <Link to={`/products?category=${cat.slug}`} style={{
        textDecoration: 'none',
        display:        'flex',
        flexDirection:  'column',
        height:         '100%',
      }}>
        {/* Image area */}
        <div style={{
          flex:       '1',
          background: showCatImage ? 'var(--black)' : 'var(--black-hover)',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow:   'hidden',
        }}>
          {showCatImage ? (
            <img
              src={categoryImage}
              alt={cat.name}
              loading="lazy"
              onError={() => setImgError(true)}
              style={{
                width:      '100%',
                height:     '100%',
                objectFit: 'cover',
                opacity:    0.85,
                transition: 'transform 0.5s ease, opacity 0.3s',
              }}
            />
          ) : (
            <span style={{ fontSize: '36px', opacity: 0.3 }}>🌳</span>
          )}
        </div>

        {/* Label */}
        <div style={{
          padding:    '14px 16px',
          borderTop:  '1px solid var(--border)',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontWeight:     600,
            fontSize:       '13px',
            color:         'var(--white)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {cat.name}
          </span>
          <span style={{
            fontSize:  '12px',
            color:     'var(--stone-muted)',
          }}>
            {cat.subcategories?.length > 0
              ? `${cat.subcategories.length}`
              : '→'}
          </span>
        </div>
      </Link>
    </Motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// PRODUCT CARD
// ══════════════════════════════════════════════════════════════
function ProductCard({ product, index, t, onAddToCart }) {
  const [imageError, setImageError] = useState(false);

  const preferredImage = useMemo(() => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images.find((img) => img?.is_main)?.image || product.images[0]?.image;
    }
    return product?.main_image || product?.image || product?.imageUrl || '';
  }, [product]);

  const isSoldOut   = product.is_sold_out || product.stock_status === 'sold_out' || !product.in_stock;
  const hasDiscount = product.discount_is_active && product.discounted_price != null;
  const discountPct = Number(product.discount_percentage || 0);

  const imageSrc = useMemo(() => {
    if (imageError) return FALLBACK_IMAGE;
    return resolveProductImageUrl(preferredImage);
  }, [imageError, preferredImage]);

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await onAddToCart(product);
  };

  return (
    <Motion.div
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -6, borderColor: 'var(--border-strong)' }}
      style={{
        background:    'var(--bg-card)',
        border:        '1px solid var(--border)',
        borderRadius:  'var(--radius-md)',
        overflow:      'hidden',
        position:      'relative',
        transition:    'border-color 0.25s',
        opacity:        isSoldOut ? 0.7 : 1,
      }}
    >
      <Link to={`/products/${product.slug}`} style={{ textDecoration: 'none' }}>

        {/* ── Image ── */}
        <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '3/4' }}>
          {preferredImage ? (
            <Motion.img
              src={imageSrc}
              alt={product.name}
              whileHover={{ scale: 1.06 }}
              transition={{ duration: 0.6 }}
              onError={() => setImageError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width:          '100%',
              height:         '100%',
              background:    'var(--black-hover)',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
              fontSize:       '48px',
              opacity:        0.2,
            }}>
              🌳
            </div>
          )}

          {/* Discount badge */}
          {hasDiscount && !isSoldOut && (
            <div style={{
              position:      'absolute',
              top:            '12px',
              left:           '12px',
              background:    'var(--danger)',
              color:         'var(--white)',
              borderRadius:  'var(--radius-sm)',
              padding:       '4px 10px',
              fontSize:       '11px',
              fontWeight:     700,
              letterSpacing: '0.06em',
            }}>
              -{discountPct}%
            </div>
          )}

          {/* Featured badge */}
          {product.is_featured && (
            <div style={{
              position:      'absolute',
              top:           hasDiscount && !isSoldOut ? '44px' : '12px',
              left:           '12px',
              background:    'var(--white)',
              color:         'var(--black)',
              borderRadius:  'var(--radius-sm)',
              padding:       '4px 10px',
              fontSize:       '10px',
              fontWeight:     700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Featured
            </div>
          )}

          {/* Sold out overlay */}
          {isSoldOut && (
            <div style={{
              position:       'absolute',
              inset:           0,
              background:    'rgba(0,0,0,0.6)',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
            }}>
              <span style={{
                fontFamily:    'var(--font-display)',
                fontSize:       '22px',
                color:         'var(--stone-muted)',
                letterSpacing: '0.1em',
              }}>
                SOLD OUT
              </span>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div style={{ padding: '18px' }}>
          <div style={{
            fontSize:       '10px',
            fontWeight:     600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         'var(--stone-muted)',
            marginBottom:  '6px',
          }}>
            {product.category?.name}
          </div>

          <div style={{
            fontWeight:    600,
            fontSize:      '14px',
            color:         'var(--white)',
            marginBottom: '14px',
            lineHeight:    1.4,
            letterSpacing: '0.01em',
          }}>
            {product.name}
          </div>

          <div style={{
            display:       'flex',
            alignItems:    'center',
            justifyContent:'space-between',
            gap:            '8px',
          }}>
            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily:    'var(--font-display)',
                fontSize:       '20px',
                color:         'var(--white)',
                letterSpacing: '0.02em',
                lineHeight:     1,
              }}>
                {hasDiscount
                  ? Number(product.discounted_price).toLocaleString()
                  : Number(product.base_price).toLocaleString()} {t('common.egp')}
              </span>
              {hasDiscount && (
                <span style={{
                  fontSize:          '12px',
                  color:            'var(--text-muted)',
                  textDecoration:   'line-through',
                }}>
                  {Number(product.base_price).toLocaleString()}
                </span>
              )}
            </div>

            {/* Add to cart */}
            <Motion.button
              whileHover={{ scale: 1.08, borderColor: 'var(--gold)', color: 'var(--gold)' }}
              whileTap={{ scale: 0.92 }}
              onClick={handleAddToCart}
              disabled={isSoldOut}
              style={{
                width:          '36px',
                height:         '36px',
                flexShrink:     0,
                background:    'transparent',
                border:        '1px solid var(--border-strong)',
                borderRadius:  'var(--radius-sm)',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                cursor:         isSoldOut ? 'not-allowed' : 'pointer',
                opacity:        isSoldOut ? 0.4 : 1,
                color:         'var(--text-secondary)',
                transition:    'border-color 0.2s, color 0.2s',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </Motion.button>
          </div>
        </div>
      </Link>
    </Motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// SKELETON
// ══════════════════════════════════════════════════════════════
function SkeletonCard({ tall }) {
  return (
    <div style={{
      background:    'var(--bg-card)',
      border:        '1px solid var(--border)',
      borderRadius:  'var(--radius-md)',
      overflow:      'hidden',
    }}>
      <div className="skeleton" style={{ height: tall ? '280px' : '160px' }} />
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="skeleton" style={{ height: '10px', width: '35%', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '14px', width: '70%', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '18px', width: '40%', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION HEADER
// ══════════════════════════════════════════════════════════════
function SectionHeader({ label, title, action }) {
  return (
    <Motion.div
      variants={fadeUp}
      style={{
        display:       'flex',
        alignItems:    'flex-end',
        justifyContent:'space-between',
        marginBottom:  '48px',
        flexWrap:      'wrap',
        gap:            '16px',
      }}
    >
      <div>
        <div style={{
          fontSize:       '10px',
          fontWeight:     600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color:         'var(--stone-muted)',
          marginBottom:  '10px',
          display:       'flex',
          alignItems:    'center',
          gap:            '10px',
        }}>
          <span style={{ display: 'block', width: '20px', height: '1px', background: 'var(--stone-muted)' }} />
          {label}
        </div>
        <h2 style={{
          fontFamily:    'var(--font-display)',
          fontSize:      'clamp(28px, 4vw, 48px)',
          color:         'var(--white)',
          lineHeight:     0.95,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {title}
        </h2>
      </div>
      {action}
    </Motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
export default function Home() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const t = (key) => ({
    'home.hero_title':    isRTL ? 'اكتشف تشكيلات ستايل مميزة' : 'Discover premium style collections',
    'home.hero_subtitle': isRTL ? 'تسوق أحدث المنتجات مع شحن سريع.' : 'Shop the latest drops with fast shipping.',
    'home.shop_now':      isRTL ? 'تسوق الآن'  : 'Shop Now',
    'home.view_all':      isRTL ? 'عرض الكل'   : 'View All',
    'home.categories':    isRTL ? 'التصنيفات'   : 'Categories',
    'home.featured':      isRTL ? 'منتجات مميزة': 'Featured',
    'common.egp':         isRTL ? 'ج.م'         : 'EGP',
  }[key] ?? key);

  const normalizeList = (data) => {
    if (Array.isArray(data))         return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/products/').then((r) => r.data),
  });

  const { data: featured, isLoading: featLoading } = useQuery({
    queryKey: ['featured'],
    queryFn:  () => api.get('/products/featured/').then((r) => r.data),
  });

  const categoriesList = normalizeList(categories);
  const featuredList   = normalizeList(featured);

  const addToCart = useAddToCartMutation();
  const handleAddToCart = async (product) => {
    const variant = getPreferredCartVariant(product);
    if (!variant?.id) return;
    try { await addToCart.mutateAsync({ variantId: variant.id, quantity: 1 }); }
    catch (err) { console.error('Add to cart error:', err); }
  };

  return (
    <div style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HERO ══ */}
      <HeroSection t={t} isRTL={isRTL} />

      {/* ══ CATEGORIES ══ */}
      <section style={{ padding: 'clamp(64px,8vw,100px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <SectionHeader
              label={isRTL ? 'تصفح حسب' : 'Browse By'}
              title={t('home.categories')}
            />

            {catsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '16px' }}>
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '16px' }}>
                {categoriesList.map((cat, i) => (
                  <CategoryCard key={cat.id} cat={cat} index={i} />
                ))}
              </div>
            )}
          </Motion.div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', paddingInline: 'clamp(20px,5vw,80px)' }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,var(--border-accent),transparent)' }} />
      </div>

      {/* ══ FEATURED PRODUCTS ══ */}
      <section style={{
        padding:    'clamp(64px,8vw,100px) clamp(20px,5vw,80px)',
        background: 'var(--black-soft)',
        position:   'relative',
        overflow:   'hidden',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
          <Motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <SectionHeader
              label={isRTL ? 'مختار لك' : 'Hand Picked'}
              title={t('home.featured')}
              action={
                <Link to="/products" style={{ textDecoration: 'none' }}>
                  <Motion.button
                    whileHover={{ borderColor: 'var(--stone)', color: 'var(--stone)' }}
                    style={{
                      background:    'transparent',
                      border:        '1px solid var(--border-strong)',
                      borderRadius:  'var(--radius-sm)',
                      padding:       '10px 22px',
                      color:         'var(--text-muted)',
                      fontSize:       '11px',
                      fontWeight:     600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor:        'pointer',
                      transition:    'border-color 0.2s,color 0.2s',
                    }}
                  >
                    {t('home.view_all')} →
                  </Motion.button>
                </Link>
              }
            />

            {featLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '20px' }}>
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} tall />)}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '20px' }}>
                {featuredList.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} t={t} onAddToCart={handleAddToCart} />
                ))}
              </div>
            )}
          </Motion.div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section style={{ padding: 'clamp(64px,8vw,100px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
            style={{
              background:   'var(--black-card)',
              border:       '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-lg)',
              padding:      'clamp(48px,8vw,80px) clamp(32px,6vw,80px)',
              textAlign:    'center',
              position:     'relative',
              overflow:     'hidden',
            }}
          >
            {/* Corner accents */}
            {[
              { top: 0, left: 0 },
              { top: 0, right: 0 },
              { bottom: 0, left: 0 },
              { bottom: 0, right: 0 },
            ].map((pos, i) => (
              <div key={i} style={{
                position:   'absolute',
                ...pos,
                width:       '40px',
                height:      '40px',
                borderTop:   pos.top === 0 ? '1px solid var(--gold)' : 'none',
                borderBottom:pos.bottom === 0 ? '1px solid var(--gold)' : 'none',
                borderLeft:  pos.left === 0 ? '1px solid var(--gold)' : 'none',
                borderRight: pos.right === 0 ? '1px solid var(--gold)' : 'none',
                opacity:     0.4,
              }} />
            ))}

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontFamily:    'var(--font-body)',
                fontSize:       '10px',
                fontWeight:     600,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color:         'var(--stone-muted)',
                marginBottom:  '16px',
              }}>
                {isRTL ? 'الكولكشن الجديد' : 'New Collection'}
              </div>

              <h2 style={{
                fontFamily:    'var(--font-display)',
                fontSize:      'clamp(36px, 6vw, 72px)',
                color:         'var(--white)',
                letterSpacing: '0.04em',
                lineHeight:     0.95,
                textTransform: 'uppercase',
                marginBottom:  '16px',
              }}>
                {isRTL ? 'ابدأ التسوق' : 'START SHOPPING'}
              </h2>

              <p style={{
                fontSize:      'clamp(13px,1.5vw,15px)',
                color:         'var(--stone-muted)',
                marginBottom:  '36px',
                letterSpacing: '0.05em',
                maxWidth:      '400px',
                margin:        '0 auto 36px',
              }}>
                {isRTL
                  ? 'جذور في الكفاح · بُني للعظمة'
                  : 'ROOTED IN STRUGGLE · BUILT FOR GREATNESS'}
              </p>

              <Link to="/products" style={{ textDecoration: 'none' }}>
                <Motion.button
                  whileHover={{ backgroundColor: 'var(--stone)', boxShadow: '0 0 40px rgba(184,155,94,0.15)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background:    'var(--white)',
                    border:        '1px solid var(--white)',
                    borderRadius:  'var(--radius-sm)',
                    padding:       '14px 44px',
                    color:         'var(--black)',
                    fontSize:       '12px',
                    fontWeight:     700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    cursor:        'pointer',
                    transition:    'background 0.25s,box-shadow 0.25s',
                  }}
                >
                  {isRTL ? 'تسوق الآن' : 'SHOP NOW'}
                </Motion.button>
              </Link>
            </div>
          </Motion.div>
        </div>
      </section>

    </div>
  );
}