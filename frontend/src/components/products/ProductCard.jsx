import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import api from '../../services/api';

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%2318192a'/%3E%3Ctext x='50%25' y='50%25' fill='%239aa0c4' font-size='34' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

function resolveProductImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return FALLBACK_IMAGE;
  }

  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) {
    return FALLBACK_IMAGE;
  }

  if (/^(https?:)?\/\//i.test(trimmedUrl) || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('blob:')) {
    return trimmedUrl;
  }

  const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim();
  const apiBaseUrl = api?.defaults?.baseURL || '';
  const absoluteBaseMatch = typeof apiBaseUrl === 'string' ? apiBaseUrl.match(/^https?:\/\/[^/]+/i) : null;
  const runtimeOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:8000';
  const apiOrigin = configuredOrigin || absoluteBaseMatch?.[0] || runtimeOrigin;  
  const mediaBase = import.meta.env.VITE_MEDIA_BASE_URL || `${apiOrigin}/media/`;

  if (trimmedUrl.startsWith('/media/')) {
    return `${apiOrigin}${trimmedUrl}`;
  }

  if (trimmedUrl.startsWith('/')) {
    return `${apiOrigin}${trimmedUrl}`;
  }

  return `${mediaBase.replace(/\/+$/, '')}/${trimmedUrl.replace(/^\/+/, '')}`;
}

export default function ProductCard({ product, index, t, onAddToCart }) {
  const [adding, setAdding] = useState(false);
  const [imageError, setImageError] = useState(false);

  const preferredImage = useMemo(() => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images.find((img) => img?.is_main)?.image || product.images[0]?.image;
    }

    return product?.main_image || product?.image || product?.imageUrl || '';
  }, [product]);

  const imageSrc = useMemo(() => {
    if (imageError) return FALLBACK_IMAGE;
    return resolveProductImageUrl(preferredImage);
  }, [imageError, preferredImage]);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!product.in_stock || adding) return;
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

          {product.is_featured && (
            <span className="absolute left-3 top-3 rounded-full bg-indigo-500/90 px-3 py-1 text-xs font-semibold text-white">
              Featured
            </span>
          )}

          {!product.in_stock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
              {t('products.out_of_stock')}
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
            {product.category?.name || '—'}
          </p>

          <h3 className="min-h-[48px] text-base font-bold text-white"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {product.name}
          </h3>

          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-extrabold text-indigo-400">
              {Number(product.base_price || 0).toLocaleString()} {t('common.egp')}
            </p>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!product.in_stock || adding}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/60 bg-indigo-500/20 text-lg text-indigo-200 transition hover:bg-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? '✓' : '🛒'}
            </button>
          </div>
        </div>
      </Link>
    </Motion.article>
  );
}