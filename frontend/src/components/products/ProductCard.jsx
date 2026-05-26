// frontend/src/components/products/ProductCard.jsx — UPDATED (Phase 5)
// Adds: Sold Out overlay, Low Stock badge, Discount price display
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import api from '../../services/api';
import { SoldOutBadge, LowStockBadge, DiscountBadge, PriceDisplay } from './ProductBadges';

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%2318192a'/%3E%3Ctext x='50%25' y='50%25' fill='%239aa0c4' font-size='34' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

function resolveProductImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return FALLBACK_IMAGE;
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return FALLBACK_IMAGE;
  if (/^(https?:)?\/\//i.test(trimmedUrl) || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('blob:')) return trimmedUrl;
  const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim();
  const apiBaseUrl = api?.defaults?.baseURL || '';
  const absoluteBaseMatch = typeof apiBaseUrl === 'string' ? apiBaseUrl.match(/^https?:\/\/[^/]+/i) : null;
  const apiOrigin = configuredOrigin || absoluteBaseMatch?.[0] || 'http://localhost:8080';
  const mediaBase = import.meta.env.VITE_MEDIA_BASE_URL || `${apiOrigin}/media/`;
  if (trimmedUrl.startsWith('/')) return `${apiOrigin}${trimmedUrl}`;
  return `${mediaBase.replace(/\/+$/, '')}/${trimmedUrl.replace(/^\/+/, '')}`;
}

export default function ProductCard({ product, index, t, onAddToCart }) {
  const [adding, setAdding] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isSoldOut = product.is_sold_out || product.stock_status === 'sold_out' || !product.in_stock;
  const isLowStock = !isSoldOut && (product.is_low_stock || product.stock_status === 'low_stock');
  const hasDiscount = product.discount_is_active && product.discounted_price != null;
  const discountPct = product.discount_percentage || 0;

  const preferredImage = useMemo(() => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images.find((img) => img?.is_main || img?.is_primary)?.image || product.images[0]?.image;
    }
    return product?.main_image || product?.image || '';
  }, [product]);

  const imageSrc = imageError ? FALLBACK_IMAGE : resolveProductImageUrl(preferredImage);

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
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-[#171a2c] shadow-lg shadow-black/10 transition-all hover:border-indigo-400/60 hover:shadow-indigo-500/20"
    >
      <Link to={`/products/${product.slug}`} className="block">
        <div className="relative h-48 w-full overflow-hidden bg-[#121423]">
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Badges top-left */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {product.is_featured && (
              <span style={{
                background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                color: '#fff', borderRadius: '8px',
                padding: '3px 10px', fontSize: '11px', fontWeight: 700,
              }}>
                ✦ Featured
              </span>
            )}
            {hasDiscount && !isSoldOut && <DiscountBadge percentage={discountPct} style={{ borderRadius: '999px', padding: '5px 12px', fontSize: '12px', boxShadow: '0 8px 24px rgba(220,38,38,0.34)' }} />}            
          </div>

          {/* Sold Out overlay */}
          {isSoldOut && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SoldOutBadge style={{ fontSize: '13px', padding: '6px 16px' }} />
            </div>
          )}

          {/* Low Stock badge */}
          {isLowStock && (
            <div style={{ position: 'absolute', bottom: '8px', left: '8px' }}>
              <LowStockBadge />
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
            {product.category?.name || '—'}
          </p>

          <h3
            className="min-h-[48px] text-base font-bold text-white"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {product.name}
          </h3>

          <div className="flex items-center justify-between gap-3">
            {/* Price */}
            <div>
              {hasDiscount ? (
                <>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'line-through', textDecorationThickness: '1.6px', fontWeight: 600, letterSpacing: '0.2px', marginBottom: '2px' }}>                    
                    {Number(product.base_price).toLocaleString()} {t('common.egp')}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--danger)', lineHeight: 1.1, textShadow: '0 2px 14px rgba(239,68,68,0.22)' }}>                    
                    {Number(product.discounted_price).toLocaleString()} {t('common.egp')}
                  </div>
                </>
              ) : (
                <p className="text-[22px] font-black leading-tight text-indigo-400" style={{ textShadow: '0 2px 16px rgba(108,99,255,0.25)' }}>                  
                  {Number(product.base_price).toLocaleString()} {t('common.egp')}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={isSoldOut || adding}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/60 bg-indigo-500/20 text-lg text-indigo-200 transition hover:bg-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-50"
              title={isSoldOut ? t('products.out_of_stock') : t('products.add_to_cart')}
            >
              {isSoldOut ? '✕' : adding ? '✓' : '🛒'}
            </button>
          </div>

          {/* Sold out text */}
          {isSoldOut && (
            <p style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700, margin: 0 }}>
              {t('products.out_of_stock')}
            </p>
          )}
        </div>
      </Link>
    </Motion.article>
  );
}
