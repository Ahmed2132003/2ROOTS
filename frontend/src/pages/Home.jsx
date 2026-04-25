import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// ─── Animation Variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }
  }),
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Sub Components ────────────────────────────────────────────────────────────

function HeroSection({ t, isRTL }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const y     = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      position: 'relative', overflow: 'hidden',
      padding: '0 5%',
    }}>

      {/* Background Effects */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(108,99,255,0.18) 0%, transparent 70%),
          radial-gradient(ellipse 40% 40% at 80% 80%, rgba(167,139,250,0.10) 0%, transparent 60%)
        `,
      }} />

      {/* Floating Orbs */}
      {[
        { w: 400, h: 400, top: '-10%', left: '-5%',  color: 'rgba(108,99,255,0.08)' },
        { w: 300, h: 300, top: '60%',  right: '-5%', color: 'rgba(167,139,250,0.08)' },
        { w: 200, h: 200, top: '30%',  left: '60%',  color: 'rgba(108,99,255,0.05)' },
      ].map((orb, i) => (
        <motion.div key={i}
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: orb.w, height: orb.h,
            top: orb.top, left: orb.left, right: orb.right,
            borderRadius: '50%',
            background: orb.color,
            filter: 'blur(60px)',
            zIndex: 0,
          }}
        />
      ))}

      {/* Grid Pattern */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(108,99,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(108,99,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Content */}
      <motion.div style={{ y, opacity, position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <motion.div variants={stagger} initial="hidden" animate="visible">

          {/* Badge */}
          <motion.div variants={fadeUp} custom={0} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'var(--accent-glow)',
            border: '1px solid rgba(108,99,255,0.3)',
            borderRadius: '50px', padding: '8px 20px',
            marginBottom: '32px',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, letterSpacing: '2px' }}>
              ✦ NEW SEASON
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1 variants={fadeUp} custom={1} style={{
            fontSize: 'clamp(48px, 8vw, 96px)',
            fontWeight: 800,
            lineHeight: 1.05,
            marginBottom: '24px',
            fontFamily: "'Syne', 'Cairo', sans-serif",
          }}>
            <span style={{
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {t('home.hero_title').split(' ').slice(0, 3).join(' ')}
            </span>
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #6C63FF, #A78BFA, #C4B5FD)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {t('home.hero_title').split(' ').slice(3).join(' ')}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={fadeUp} custom={2} style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'var(--text-secondary)',
            marginBottom: '48px',
            maxWidth: '560px',
            lineHeight: 1.8,
          }}>
            {t('home.hero_subtitle')}
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} custom={3}
            style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link to="/products" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(108,99,255,0.4)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                  border: 'none', borderRadius: '16px',
                  padding: '16px 40px',
                  color: 'white', fontSize: '16px', fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.5px',
                }}
              >
                {t('home.shop_now')} →
              </motion.button>
            </Link>

            <Link to="/products" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-hover)',
                  borderRadius: '16px', padding: '16px 40px',
                  color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('home.view_all')}
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={4}
            style={{ display: 'flex', gap: '48px', marginTop: '72px', flexWrap: 'wrap' }}>
            {[
              { num: '10K+', label: isRTL ? 'عميل سعيد' : 'Happy Customers' },
              { num: '500+', label: isRTL ? 'منتج مميز' : 'Products' },
              { num: '99%',  label: isRTL ? 'رضا العملاء' : 'Satisfaction' },
            ].map((stat, i) => (
              <div key={i}>
                <div style={{
                  fontSize: '36px', fontWeight: 800,
                  background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  fontFamily: "'Syne', sans-serif",
                }}>
                  {stat.num}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute', bottom: '40px',
          left: '50%', transform: 'translateX(-50%)',
          color: 'var(--text-muted)', fontSize: '24px', zIndex: 1,
        }}
      >
        ↓
      </motion.div>
    </section>
  );
}


function CategoryCard({ cat, index }) {
  return (
    <motion.div
      variants={fadeUp} custom={index}
      whileHover={{ y: -8, scale: 1.02 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        aspectRatio: '1',
      }}
    >
      <Link to={`/products?category=${cat.slug}`} style={{ textDecoration: 'none' }}>
        {cat.image ? (
          <img src={cat.image} alt={cat.name}
            style={{ width: '100%', height: '70%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            height: '70%',
            background: 'linear-gradient(135deg, var(--accent-glow), var(--bg-hover))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px',
          }}>
            🏷️
          </div>
        )}
        <div style={{ padding: '16px' }}>
          <div style={{
            fontWeight: 700, fontSize: '16px',
            color: 'var(--text-primary)', marginBottom: '4px',
          }}>
            {cat.name}
          </div>
          <div style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600 }}>
            {cat.subcategories?.length > 0
              ? `${cat.subcategories.length} ${cat.subcategories.length > 1 ? 'subcategories' : 'subcategory'}`
              : 'Explore →'}
          </div>
        </div>

        {/* Hover Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(108,99,255,0.15), transparent)',
            borderRadius: '20px',
          }}
        />
      </Link>
    </motion.div>
  );
}


function ProductCard({ product, index, t }) {
  return (
    <motion.div
      variants={fadeUp} custom={index}
      whileHover={{ y: -8 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.3s',
      }}
      onHoverStart={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onHoverEnd={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <Link to={`/products/${product.slug}`} style={{ textDecoration: 'none' }}>

        {/* Image */}
        <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4/3' }}>
          {product.main_image ? (
            <motion.img
              src={product.main_image} alt={product.name}
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.5 }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, var(--bg-hover), var(--accent-glow))',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '64px',
            }}>
              📦
            </div>
          )}

          {/* Badge */}
          {product.is_featured && (
            <div style={{
              position: 'absolute', top: '12px', left: '12px',
              background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
              color: 'white', borderRadius: '8px',
              padding: '4px 12px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '1px',
            }}>
              ✦ FEATURED
            </div>
          )}

          {/* Out of Stock */}
          {!product.in_stock && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '16px',
            }}>
              {t('products.out_of_stock')}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '20px' }}>
          <div style={{
            fontSize: '12px', color: 'var(--accent)',
            fontWeight: 700, marginBottom: '8px',
            letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            {product.category?.name}
          </div>
          <div style={{
            fontWeight: 700, fontSize: '16px',
            color: 'var(--text-primary)', marginBottom: '12px',
            lineHeight: 1.4,
          }}>
            {product.name}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{
              fontSize: '22px', fontWeight: 800,
              background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {Number(product.base_price).toLocaleString()} {t('common.egp')}
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: '36px', height: '36px',
                background: 'var(--accent-glow)',
                border: '1px solid var(--accent)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              🛒
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}


// ─── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/products/').then(r => r.data),
  });

  const { data: featured, isLoading: featLoading } = useQuery({
    queryKey: ['featured'],
    queryFn:  () => api.get('/products/featured/').then(r => r.data),
  });

  return (
    <div>

      {/* ── Hero ── */}
      <HeroSection t={t} isRTL={isRTL} />

      {/* ── Categories ── */}
      <section style={{ padding: '100px 5%' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            {/* Section Header */}
            <motion.div variants={fadeUp} style={{ marginBottom: '56px' }}>
              <div style={{
                fontSize: '12px', color: 'var(--accent)',
                fontWeight: 700, letterSpacing: '3px',
                marginBottom: '16px', textTransform: 'uppercase',
              }}>
                ✦ {t('home.categories')}
              </div>
              <h2 style={{
                fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800,
                color: 'var(--text-primary)',
                fontFamily: "'Syne', 'Cairo', sans-serif",
              }}>
                {t('home.categories')}
              </h2>
            </motion.div>

            {catsLoading ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px',
              }}>
                {[...Array(4)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px',
              }}>
                {categories?.map((cat, i) => (
                  <CategoryCard key={cat.id} cat={cat} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section style={{
        padding: '100px 5%',
        background: 'var(--bg-secondary)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* BG Glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            {/* Section Header */}
            <motion.div variants={fadeUp} style={{
              display: 'flex', alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '56px', flexWrap: 'wrap', gap: '16px',
            }}>
              <div>
                <div style={{
                  fontSize: '12px', color: 'var(--accent)',
                  fontWeight: 700, letterSpacing: '3px',
                  marginBottom: '16px', textTransform: 'uppercase',
                }}>
                  ✦ {t('home.featured')}
                </div>
                <h2 style={{
                  fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800,
                  color: 'var(--text-primary)',
                  fontFamily: "'Syne', 'Cairo', sans-serif",
                }}>
                  {t('home.featured')}
                </h2>
              </div>
              <Link to="/products" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ x: isRTL ? -4 : 4 }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-hover)',
                    borderRadius: '12px', padding: '12px 24px',
                    color: 'var(--text-primary)', cursor: 'pointer',
                    fontWeight: 600, fontSize: '14px',
                  }}
                >
                  {t('home.view_all')} {isRTL ? '←' : '→'}
                </motion.button>
              </Link>
            </motion.div>

            {featLoading ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '24px',
              }}>
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} tall />)}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '24px',
              }}>
                {featured?.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} t={t} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '100px 5%' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'linear-gradient(135deg, #6C63FF 0%, #A78BFA 50%, #6C63FF 100%)',
              backgroundSize: '200% 200%',
              borderRadius: '32px',
              padding: 'clamp(48px, 8vw, 80px)',
              textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* BG Pattern */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `
                radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 50%)
              `,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800,
                color: 'white', marginBottom: '16px',
                fontFamily: "'Syne', 'Cairo', sans-serif",
              }}>
                {isRTL ? 'ابدأ التسوق الآن' : 'Start Shopping Today'}
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: 'clamp(16px, 2vw, 18px)',
                marginBottom: '40px',
              }}>
                {t('home.hero_subtitle')}
              </p>
              <Link to="/products" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: 'white',
                    border: 'none', borderRadius: '16px',
                    padding: '16px 48px',
                    color: '#6C63FF', fontSize: '16px', fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {t('home.shop_now')} ✦
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}


// ─── Skeleton Loader ───────────────────────────────────────────────────────────

function SkeletonCard({ tall }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px', overflow: 'hidden',
      }}
    >
      <div style={{
        height: tall ? '200px' : '140px',
        background: 'var(--bg-hover)',
      }} />
      <div style={{ padding: '20px' }}>
        <div style={{
          height: '14px', width: '40%',
          background: 'var(--bg-hover)',
          borderRadius: '8px', marginBottom: '12px',
        }} />
        <div style={{
          height: '18px', width: '70%',
          background: 'var(--bg-hover)',
          borderRadius: '8px', marginBottom: '16px',
        }} />
        <div style={{
          height: '14px', width: '30%',
          background: 'var(--bg-hover)',
          borderRadius: '8px',
        }} />
      </div>
    </motion.div>
  );
}