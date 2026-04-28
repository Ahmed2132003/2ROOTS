import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
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

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

function ProductCard({ product, index, t, onAddToCart }) {
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
  
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!product.in_stock) return;
    setAdding(true);
    await onAddToCart(product);
    setTimeout(() => setAdding(false), 800);
  };

  return (
    <Motion.div
      layout
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -6, borderColor: 'var(--accent)' }}      
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.3s',
      }}      
    >
      <Link to={`/products/${product.slug}`} style={{ textDecoration: 'none' }}>
        <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4/3' }}>
          <Motion.img
            src={imageSrc}
            alt={product.name}
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.5 }}
            onError={() => setImageError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {product.is_featured && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                color: 'white',
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
              }}
            >
              ✦ FEATURED
            </div>
          )}

          {!product.in_stock && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '15px',
                letterSpacing: '1px',
              }}
            >
              {t('products.out_of_stock')}
            </div>
          )}
        </div>

        <div style={{ padding: '20px' }}>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--accent)',
              fontWeight: 700,
              marginBottom: '8px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            {product.category?.name}
          </div>

          <div
            style={{
              fontWeight: 700,
              fontSize: '15px',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.name}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {Number(product.base_price).toLocaleString()} {t('common.egp')}
            </div>

            <Motion.button
              onClick={handleAdd}
              whileHover={{ scale: product.in_stock ? 1.1 : 1 }}
              whileTap={{ scale: product.in_stock ? 0.9 : 1 }}
              animate={adding ? { rotate: [0, -10, 10, 0] } : {}}
              style={{
                width: '40px',
                height: '40px',
                background: adding
                  ? 'var(--success)'
                  : product.in_stock
                    ? 'var(--accent-glow)'
                    : 'var(--bg-hover)',
                border: `1px solid ${
                  adding
                    ? 'var(--success)'
                    : product.in_stock
                      ? 'var(--accent)'
                      : 'var(--border)'
                }`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                cursor: product.in_stock ? 'pointer' : 'not-allowed',
                transition: 'background 0.3s, border 0.3s',
                flexShrink: 0,
              }}
            >
              {adding ? '✓' : '🛒'}
            </Motion.button>
          </div>
        </div>
      </Link>
    </Motion.div>
  );
}

function SkeletonCard() {
  return (
    <Motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}
    >
      <div style={{ height: '200px', background: 'var(--bg-hover)' }} />
      <div style={{ padding: '20px' }}>
        {[40, 70, 30].map((w, i) => (
          <div
            key={i}
            style={{
              height: i === 1 ? '18px' : '14px',
              width: `${w}%`,
              background: 'var(--bg-hover)',
              borderRadius: '8px',
              marginBottom: i < 2 ? '12px' : 0,
            }}
          />
        ))}
      </div>
    </Motion.div>
  );
}

function FilterPanel({ filters, setFilters, categories, t, isRTL, onClose, isMobile }) {
  const categoryList = Array.isArray(categories)
    ? categories
    : Array.isArray(categories?.results)
      ? categories.results
      : [];

  const content = (
    <div
      style={{
        background: isMobile ? 'var(--bg-secondary)' : 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: isMobile ? '24px 24px 0 0' : '20px',
        padding: '28px',
        position: isMobile ? 'fixed' : 'sticky',
        bottom: isMobile ? 0 : 'auto',
        left: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        top: isMobile ? 'auto' : '90px',
        zIndex: isMobile ? 200 : 1,
        maxHeight: isMobile ? '80vh' : 'calc(100vh - 110px)',
        overflowY: 'auto',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
        }}
      >
        <h3 style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>{t('products.filter')}</h3>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-hover)',
              border: 'none',
              borderRadius: '10px',
              padding: '6px 12px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '2px',
            color: 'var(--text-muted)',
            marginBottom: '14px',
            textTransform: 'uppercase',
          }}
        >
          {t('home.categories')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[{ slug: '', name: isRTL ? 'الكل' : 'All' }, ...categoryList].map((cat) => (
            <Motion.button
              key={cat.slug || 'all'}
              whileHover={{ x: isRTL ? -4 : 4 }}
              onClick={() => setFilters((f) => ({ ...f, category: cat.slug }))}
              style={{
                background: filters.category === cat.slug ? 'var(--accent-glow)' : 'transparent',
                border:
                  filters.category === cat.slug ? '1px solid var(--accent)' : '1px solid transparent',
                borderRadius: '12px',
                padding: '10px 14px',
                color: filters.category === cat.slug ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                textAlign: isRTL ? 'right' : 'left',
                width: '100%',
                transition: 'all 0.2s',
              }}
            >
              {cat.name}
            </Motion.button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '2px',
            color: 'var(--text-muted)',
            marginBottom: '14px',
            textTransform: 'uppercase',
          }}
        >
          {t('products.price')}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { key: 'min_price', placeholder: isRTL ? 'من' : 'Min' },
            { key: 'max_price', placeholder: isRTL ? 'إلى' : 'Max' },
          ].map(({ key, placeholder }) => (
            <input
              key={key}
              type="number"
              placeholder={placeholder}
              value={filters[key]}
              onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
              style={{
                flex: 1,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <Motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setFilters((f) => ({ ...f, in_stock: !f.in_stock }))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            padding: 0,
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              background: filters.in_stock ? 'var(--accent)' : 'var(--bg-primary)',
              border: `2px solid ${filters.in_stock ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            {filters.in_stock && (
              <Motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}
              >
                ✓
              </Motion.span>
            )}
          </div>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
            {t('products.in_stock')}
          </span>
        </Motion.button>
      </div>

      <Motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setFilters(DEFAULT_FILTERS)}
        style={{
          width: '100%',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '12px',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        {isRTL ? '↺ إعادة ضبط' : '↺ Reset Filters'}
      </Motion.button>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 199,
          }}
        />
        <Motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200 }}
        >
          {content}
        </Motion.div>
      </AnimatePresence>
    );
  }

  return content;
}

export default function Products() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [searchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

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
    queryFn: () => api.get(`/products/items/?${queryParams}`).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/').then((r) => r.data),
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
    <div style={{ minHeight: '100vh', padding: '40px 5%' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: '40px' }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'var(--accent)',
              fontWeight: 700,
              letterSpacing: '3px',
              marginBottom: '12px',
              textTransform: 'uppercase',
            }}
          >
            ✦ {t('nav.products')}
          </div>
          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: "'Syne', 'Cairo', sans-serif",
            }}
          >
            {t('products.title')}
          </h1>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                [isRTL ? 'right' : 'left']: '16px',
                color: 'var(--text-muted)',
                fontSize: '18px',
                pointerEvents: 'none',
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder={t('products.search')}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: isRTL ? '14px 48px 14px 16px' : '14px 16px 14px 48px',
                color: 'var(--text-primary)',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
              }}
            />
          </div>

          <select
            value={filters.ordering}
            onChange={(e) => setFilters((f) => ({ ...f, ordering: e.target.value }))}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '14px 20px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: 600,
              minWidth: '180px',
            }}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {isMobile && (
            <Motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterOpen(true)}
              style={{
                background: 'var(--accent-glow)',
                border: '1px solid var(--accent)',
                borderRadius: '14px',
                padding: '14px 20px',
                color: 'var(--accent)',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ⚙️ {t('products.filter')}
            </Motion.button>
          )}
        </Motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '260px 1fr',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {!isMobile && !isRTL && (
            <FilterPanel filters={filters} setFilters={setFilters} categories={categories} t={t} isRTL={isRTL} />
          )}

          <div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '14px',
                marginBottom: '24px',
                fontWeight: 600,
              }}
            >
              {isLoading ? '...' : `${products.length} ${isRTL ? 'منتج' : 'products'}`}
            </div>

            {isLoading ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '20px',
                }}
              >
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    marginBottom: '8px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {t('products.no_products')}
                </div>
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  style={{
                    marginTop: '24px',
                    background: 'var(--accent-glow)',
                    border: '1px solid var(--accent)',
                    borderRadius: '14px',
                    padding: '12px 28px',
                    color: 'var(--accent)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {isRTL ? '↺ إعادة ضبط الفلتر' : '↺ Reset Filters'}
                </Motion.button>
              </Motion.div>
            ) : (
              <Motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '20px',
                }}
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
            <FilterPanel filters={filters} setFilters={setFilters} categories={categories} t={t} isRTL={isRTL} />
          )}
        </div>
      </div>

      {isMobile && filterOpen && (
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          t={t}
          isRTL={isRTL}
          onClose={() => setFilterOpen(false)}
          isMobile
        />
      )}
    </div>
  );
}