import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion as Motion } from 'framer-motion';
import api from '../services/api';

const DEFAULT_FILTERS = {
  category: '',
  min_price: '',
  max_price: '',
  in_stock: false,
  search: '',
  ordering: '-created_at',
};

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%2318192a'/%3E%3Ctext x='50%25' y='50%25' fill='%239aa0c4' font-size='34' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

function resolveProductImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return FALLBACK_IMAGE;

  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return FALLBACK_IMAGE;

  if (
    /^(https?:)?\/\//i.test(trimmedUrl) ||
    trimmedUrl.startsWith('data:') ||
    trimmedUrl.startsWith('blob:')
  ) {
    return trimmedUrl;
  }

  const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:8000';
  const mediaBase = import.meta.env.VITE_MEDIA_BASE_URL || `${apiOrigin}/media/`;

  if (trimmedUrl.startsWith('/media/')) {
    return `${apiOrigin}${trimmedUrl}`;
  }

  if (trimmedUrl.startsWith('/')) {
    return `${apiOrigin}${trimmedUrl}`;
  }

  return `${mediaBase.replace(/\/+$/, '')}/${trimmedUrl.replace(/^\/+/, '')}`;
}

function ProductCard({ product, index, t, onAddToCart }) {
  const [adding, setAdding] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageSrc = useMemo(() => {
    if (imageError) return FALLBACK_IMAGE;
    return resolveProductImageUrl(product.main_image);
  }, [imageError, product.main_image]);

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

          <h3
            className="min-h-[48px] text-base font-bold text-white"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
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

function FiltersPanel({ filters, setFilters, categories, isRTL, t }) {
  const categoryList = Array.isArray(categories)
    ? categories
    : Array.isArray(categories?.results)
      ? categories.results
      : [];

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <aside className="rounded-2xl border border-white/10 bg-[#171a2c] p-5 shadow-lg shadow-black/10 md:sticky md:top-24">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{t('products.filter')}</h3>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-indigo-400/50 hover:text-indigo-200"
        >
          {isRTL ? 'إعادة ضبط' : 'Reset'}
        </button>
      </div>

      <div className="space-y-6">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('home.categories')}</p>
          <div className="space-y-2">
            {[{ slug: '', name: isRTL ? 'الكل' : 'All' }, ...categoryList].map((cat) => (
              <Motion.button
                whileHover={{ x: isRTL ? -2 : 2 }}
                key={cat.slug || 'all'}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: cat.slug }))}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  filters.category === cat.slug
                    ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                    : 'border-white/10 bg-[#111324] text-slate-300 hover:border-indigo-400/60'
                }`}
              >
                {cat.name}
              </Motion.button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('products.price')}</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder={isRTL ? 'من' : 'Min'}
              value={filters.min_price}
              onChange={(event) => setFilters((prev) => ({ ...prev, min_price: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#111324] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
            <input
              type="number"
              placeholder={isRTL ? 'إلى' : 'Max'}
              value={filters.max_price}
              onChange={(event) => setFilters((prev) => ({ ...prev, max_price: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#111324] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </section>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-[#111324] px-3 py-2.5">
          <span className="text-sm font-medium text-slate-200">{t('products.in_stock')}</span>
          <input
            type="checkbox"
            checked={filters.in_stock}
            onChange={() => setFilters((prev) => ({ ...prev, in_stock: !prev.in_stock }))}
            className="h-4 w-4 accent-indigo-500"
          />
        </label>
      </div>
    </aside>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#171a2c]">
      <div className="h-48 animate-pulse bg-[#20253a]" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-[#20253a]" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-[#20253a]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-[#20253a]" />
      </div>
    </div>
  );
}

export default function Products() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    category: searchParams.get('category') || '',
  });

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.in_stock) params.set('in_stock', 'true');
    if (filters.search) params.set('search', filters.search);
    if (filters.ordering) params.set('ordering', filters.ordering);
    return params.toString();
  }, [filters]);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => api.get(`/products/items/?${queryParams}`).then((response) => response.data),
    keepPreviousData: true,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/').then((response) => response.data),
  });

  const handleAddToCart = async (product) => {
    const firstVariant = product.variants?.[0];
    if (!firstVariant) return;

    try {
      await api.post('/cart/add/', { variant_id: firstVariant.id, quantity: 1 });
    } catch (error) {
      console.error('Failed to add product to cart from listing:', error);
    }
  };

  const products = productsData?.results || productsData || [];
  const sortOptions = [
    { value: '-created_at', label: isRTL ? 'الأحدث' : 'Newest' },
    { value: 'base_price', label: isRTL ? 'السعر: الأقل' : 'Price: Low to High' },
    { value: '-base_price', label: isRTL ? 'السعر: الأعلى' : 'Price: High to Low' },
  ];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">{t('nav.products')}</p>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{t('products.title')}</h1>
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#171a2c] p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <span
                className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                  isRTL ? 'right-3' : 'left-3'
                }`}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder={t('products.search')}
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                className={`w-full rounded-xl border border-white/10 bg-[#111324] py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none ${
                  isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'
                }`}
              />
            </div>

            <select
              value={filters.ordering}
              onChange={(event) => setFilters((prev) => ({ ...prev, ordering: event.target.value }))}
              className="rounded-xl border border-white/10 bg-[#111324] px-3 py-2.5 text-sm text-white focus:border-indigo-400 focus:outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <FiltersPanel
            filters={filters}
            setFilters={setFilters}
            categories={categories}
            isRTL={isRTL}
            t={t}
          />

          <section className="space-y-4">
            <p className="text-sm font-medium text-slate-400">
              {isLoading ? '...' : `${products.length} ${isRTL ? 'منتج' : 'products'}`}
            </p>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#171a2c] px-6 py-14 text-center text-slate-300">
                <p className="text-4xl">🔍</p>
                <p className="mt-3 text-lg font-semibold text-white">{t('products.no_products')}</p>
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-5 rounded-xl border border-indigo-400/70 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/30"
                >
                  {isRTL ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                </button>
              </div>
            ) : (
              <Motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    t={t}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </Motion.div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}