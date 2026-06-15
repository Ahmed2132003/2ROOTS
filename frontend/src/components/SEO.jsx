/**
 * SEO.jsx — Reusable head manager for every page
 * يتحط في أول كل صفحة عشان يضبط الـ meta tags ديناميكياً
 *
 * الاستخدام:
 *   <SEO title="..." description="..." image="..." type="product" product={...} />
 */

import { useEffect } from 'react';

const SITE_NAME    = '2ROOTS';
const SITE_URL     = 'https://2roots.store';
const DEFAULT_IMG  = `${SITE_URL}/og-image.jpg`;
const DEFAULT_DESC = 'متجر ملابس مصري أصيل — تيشرتات وملابس ستايل فريد. شحن سريع لكل مصر. Rooted in Struggle, Built for Greatness.';

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute('id', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function SEO({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMG,
  url,
  type = 'website',
  product = null,
  breadcrumbs = null,
  noindex = false,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | تيشرتات وملابس أصيلة`;
    const fullUrl   = url ? `${SITE_URL}${url}` : SITE_URL;
    const fullImage = image?.startsWith('http') ? image : image ? `${SITE_URL}${image}` : DEFAULT_IMG;

    // ── Document title ──
    document.title = fullTitle;

    // ── Basic meta ──
    setMeta('description', description);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');

    // ── Canonical ──
    setLink('canonical', fullUrl);

    // ── Open Graph ──
    setMeta('og:type',        type === 'product' ? 'product' : 'website', 'property');
    setMeta('og:url',         fullUrl,     'property');
    setMeta('og:title',       fullTitle,   'property');
    setMeta('og:description', description, 'property');
    setMeta('og:image',       fullImage,   'property');
    setMeta('og:site_name',   SITE_NAME,   'property');

    // ── Twitter ──
    setMeta('twitter:title',       fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image',       fullImage);

    // ── Product structured data ──
    if (product) {
      const price   = product.discounted_price ?? product.base_price ?? 0;
      const inStock = product.in_stock && !product.is_sold_out;

      setJsonLd('ld-product', {
        '@context': 'https://schema.org',
        '@type':    'Product',
        name:        product.name,
        description: product.description || description,
        image:       fullImage,
        sku:         `2ROOTS-${product.id}`,
        brand: {
          '@type': 'Brand',
          name:    '2ROOTS',
        },
        offers: {
          '@type':         'Offer',
          url:              fullUrl,
          priceCurrency:   'EGP',
          price:            Number(price).toFixed(2),
          availability:     inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name:    '2ROOTS',
          },
        },
        ...(product.category?.name ? {
          category: product.category.name,
        } : {}),
      });
    } else {
      // إزالة الـ product LD+JSON لو مش في صفحة منتج
      const old = document.getElementById('ld-product');
      if (old) old.remove();
    }

    // ── BreadcrumbList structured data ──
    if (breadcrumbs) {
      setJsonLd('ld-breadcrumb', {
        '@context':        'https://schema.org',
        '@type':           'BreadcrumbList',
        itemListElement:    breadcrumbs.map((crumb, i) => ({
          '@type':    'ListItem',
          position:    i + 1,
          name:        crumb.name,
          item:        `${SITE_URL}${crumb.url}`,
        })),
      });
    } else {
      const old = document.getElementById('ld-breadcrumb');
      if (old) old.remove();
    }
  }, [title, description, image, url, type, product, breadcrumbs, noindex]);

  return null;
}