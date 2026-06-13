// frontend/src/components/products/ProductCard.jsx
// 2ROOTS Dark Theme — Luxury Streetwear
// Design System: #0A0A0A bg, #FFFFFF text, #D8D2C2 stone, #2F4F3E green, #B89B5E gold (hover only)

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import api from '../../services/api';
import { SoldOutBadge, LowStockBadge, DiscountBadge } from './ProductBadges';

// ─── Fallback Image ────────────────────────────────────────────────────────────
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%230A0A0A'/%3E%3Ctext x='50%25' y='48%25' fill='%23D8D2C2' font-size='28' text-anchor='middle' dominant-baseline='middle' font-family='Arial,sans-serif' letter-spacing='6'%3E2ROOTS%3C/text%3E%3Ctext x='50%25' y='58%25' fill='%23D8D2C2' font-size='13' text-anchor='middle' dominant-baseline='middle' font-family='Arial,sans-serif' opacity='0.5'%3ENO IMAGE%3C/text%3E%3C/svg%3E";

// ─── URL Resolver ──────────────────────────────────────────────────────────────
function resolveProductImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return FALLBACK_IMAGE;
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return FALLBACK_IMAGE;
  if (
    /^(https?:)?\/\//i.test(trimmedUrl) ||
    trimmedUrl.startsWith('data:') ||
    trimmedUrl.startsWith('blob:')
  )
    return trimmedUrl;

  const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim();
  const apiBaseUrl = api?.defaults?.baseURL || '';
  const absoluteBaseMatch =
    typeof apiBaseUrl === 'string' ? apiBaseUrl.match(/^https?:\/\/[^/]+/i) : null;
  const apiOrigin =
    configuredOrigin || absoluteBaseMatch?.[0] || window.location.origin;
    
  const mediaBase =
    import.meta.env.VITE_MEDIA_BASE_URL || `${apiOrigin}/media/`;
  if (trimmedUrl.startsWith('/')) return `${apiOrigin}${trimmedUrl}`;
  return `${mediaBase.replace(/\/+$/, '')}/${trimmedUrl.replace(/^\/+/, '')}`;
}

// ─── Card Styles ───────────────────────────────────────────────────────────────
const styles = {
  card: {
    display: 'block',
    background: '#111111',
    border: '1px solid rgba(216, 210, 194, 0.10)',
    borderRadius: '4px',           // sharp corners — luxury streetwear aesthetic
    overflow: 'hidden',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
  },
  // gold border + shadow on hover — applied via whileHover + CSS var trick
  cardHover: {
    borderColor: 'rgba(184, 155, 94, 0.55)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '3 / 4',           // portrait ratio — editorial / apparel standard
    overflow: 'hidden',
    background: '#0A0A0A',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  imageHover: {
    transform: 'scale(1.06)',
  },
  badgesTopLeft: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    zIndex: 2,
  },
  featuredBadge: {
    background: 'transparent',
    border: '1px solid rgba(216, 210, 194, 0.6)',
    color: '#D8D2C2',
    borderRadius: '2px',
    padding: '3px 8px',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontFamily: 'Inter, sans-serif',
  },
  soldOutOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  lowStockWrap: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    zIndex: 2,
  },
  body: {
    padding: '16px 16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    background: '#111111',
  },
  category: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: '#D8D2C2',
    fontFamily: 'Inter, sans-serif',
    opacity: 0.7,
    margin: 0,
  },
  name: {
    fontSize: '15px',
    fontFamily: 'Bebas Neue, sans-serif',
    letterSpacing: '1.5px',
    color: '#FFFFFF',
    lineHeight: 1.2,
    margin: 0,
    minHeight: '36px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  footer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: '4px',
  },
  priceWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  originalPrice: {
    fontSize: '12px',
    color: 'rgba(217, 217, 217, 0.45)',
    textDecoration: 'line-through',
    textDecorationColor: 'rgba(217, 217, 217, 0.35)',
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
  },
  salePrice: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#FFFFFF',
    fontFamily: 'Inter, sans-serif',
    letterSpacing: '-0.3px',
    lineHeight: 1,
  },
  regularPrice: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#FFFFFF',
    fontFamily: 'Inter, sans-serif',
    letterSpacing: '-0.3px',
    lineHeight: 1,
  },
  currency: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#D9D9D9',
    marginLeft: '3px',
    letterSpacing: '1px',
  },
  addBtn: {
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
    border: '1px solid rgba(216, 210, 194, 0.3)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    flexShrink: 0,
    color: '#D8D2C2',
    fontSize: '14px',
  },
  addBtnHover: {
    borderColor: '#B89B5E',
    color: '#B89B5E',
    background: 'rgba(184, 155, 94, 0.08)',
  },
  addBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  soldOutText: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#D8D2C2',
    opacity: 0.55,
    fontFamily: 'Inter, sans-serif',
    margin: 0,
  },
};

// ─── Add Button with hover ─────────────────────────────────────────────────────
function AddButton({ isSoldOut, adding, onClick, t }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSoldOut || adding}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.addBtn,
        ...(hovered && !isSoldOut && !adding ? styles.addBtnHover : {}),
        ...(isSoldOut || adding ? styles.addBtnDisabled : {}),
      }}
      title={isSoldOut ? t('products.out_of_stock') : t('products.add_to_cart')}
      aria-label={isSoldOut ? t('products.out_of_stock') : t('products.add_to_cart')}
    >
      {isSoldOut ? '—' : adding ? '✓' : '+'}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProductCard({ product, index, t, onAddToCart }) {
  const [adding, setAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);
  const [imgHovered, setImgHovered] = useState(false);

  // Stock & discount flags
  const isSoldOut =
    product.is_sold_out ||
    product.stock_status === 'sold_out' ||
    !product.in_stock;
  const isLowStock =
    !isSoldOut &&
    (product.is_low_stock || product.stock_status === 'low_stock');
  const hasDiscount =
    product.discount_is_active && product.discounted_price != null;
  const discountPct = product.discount_percentage || 0;

  // Image resolution
  const preferredImage = useMemo(() => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return (
        product.images.find((img) => img?.is_main || img?.is_primary)?.image ||
        product.images[0]?.image
      );
    }
    return product?.main_image || product?.image || '';
  }, [product]);

  const imageSrc = imageError
    ? FALLBACK_IMAGE
    : resolveProductImageUrl(preferredImage);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut || adding) return;
    setAdding(true);
    await onAddToCart(product);
    setTimeout(() => setAdding(false), 700);
  };

  return (
    <Motion.article
      layout
      custom={index}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      style={{
        ...styles.card,
        ...(cardHovered ? styles.cardHover : {}),
      }}
    >
      <Link
        to={`/products/${product.slug}`}
        style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
      >
        {/* ── Image ── */}
        <div
          style={styles.imageWrap}
          onMouseEnter={() => setImgHovered(true)}
          onMouseLeave={() => setImgHovered(false)}
        >
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            onError={() => setImageError(true)}
            style={{
              ...styles.image,
              ...(imgHovered ? styles.imageHover : {}),
            }}
          />

          {/* Badges — top left */}
          <div style={styles.badgesTopLeft}>
            {product.is_featured && (
              <span style={styles.featuredBadge}>FEATURED</span>
            )}
            {hasDiscount && !isSoldOut && (
              <DiscountBadge percentage={discountPct} />
            )}
          </div>

          {/* Sold Out overlay */}
          {isSoldOut && (
            <div style={styles.soldOutOverlay}>
              <SoldOutBadge />
            </div>
          )}

          {/* Low Stock badge — bottom left */}
          {isLowStock && (
            <div style={styles.lowStockWrap}>
              <LowStockBadge />
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={styles.body}>
          {/* Category */}
          <p style={styles.category}>
            {product.category?.name || '—'}
          </p>

          {/* Name */}
          <h3 style={styles.name}>{product.name}</h3>

          {/* Price + CTA */}
          <div style={styles.footer}>
            {/* Price */}
            <div style={styles.priceWrap}>
              {hasDiscount ? (
                <>
                  <span style={styles.originalPrice}>
                    {Number(product.base_price).toLocaleString()}
                    <span style={styles.currency}>
                      {t('common.egp')}
                    </span>
                  </span>
                  <span style={styles.salePrice}>
                    {Number(product.discounted_price).toLocaleString()}
                    <span style={styles.currency}>
                      {t('common.egp')}
                    </span>
                  </span>
                </>
              ) : (
                <span style={styles.regularPrice}>
                  {Number(product.base_price).toLocaleString()}
                  <span style={styles.currency}>
                    {t('common.egp')}
                  </span>
                </span>
              )}
            </div>

            {/* Add to cart */}
            <AddButton
              isSoldOut={isSoldOut}
              adding={adding}
              onClick={handleAdd}
              t={t}
            />
          </div>

          {/* Sold out label */}
          {isSoldOut && (
            <p style={styles.soldOutText}>
              {t('products.out_of_stock')}
            </p>
          )}
        </div>
      </Link>
    </Motion.article>
  );
}