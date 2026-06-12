// frontend/src/components/products/CategoryCard.jsx
// 2ROOTS Dark Theme — Luxury Streetwear
// Design System: #0A0A0A bg · #111111 surface · #D8D2C2 stone · #2F4F3E green · #B89B5E gold (hover)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';

// ─── URL Resolver (unchanged logic) ───────────────────────────────────────────
function resolveImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const apiOrigin = import.meta.env.VITE_API_ORIGIN?.trim() || 'http://localhost:8080';
  if (trimmed.startsWith('/')) return `${apiOrigin}${trimmed}`;
  const mediaBase = import.meta.env.VITE_MEDIA_BASE_URL || `${apiOrigin}/media/`;
  return `${mediaBase.replace(/\/+$/, '')}/${trimmed.replace(/^\/+/, '')}`;
}

// ─── Fallback — text-based, no external assets ────────────────────────────────
function CategoryFallback({ name }) {
  // First letter of category — editorial, works without any image
  const initial = name?.charAt(0)?.toUpperCase() || '—';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A0A',
        position: 'relative',
      }}
    >
      {/* Large faded initial */}
      <span
        aria-hidden="true"
        style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 'clamp(64px, 30%, 120px)',
          color: 'rgba(216, 210, 194, 0.07)',
          lineHeight: 1,
          userSelect: 'none',
          letterSpacing: '4px',
        }}
      >
        {initial}
      </span>
      {/* Center mark */}
      <div
        style={{
          position: 'absolute',
          width: '28px',
          height: '1px',
          background: 'rgba(216, 210, 194, 0.25)',
        }}
      />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CategoryCard({ cat, index }) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const imageUrl = resolveImageUrl(cat.image_url || cat.image);
  const showImage = imageUrl && !imgError;

  const subcatCount = cat.subcategories?.length ?? 0;
  const metaLine = subcatCount > 0
    ? `${subcatCount} ${subcatCount > 1 ? 'subcategories' : 'subcategory'}`
    : 'Explore';

  return (
    <Motion.div
      custom={index}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: '#111111',
        border: `1px solid ${hovered ? 'rgba(184,155,94,0.45)' : 'rgba(216,210,194,0.09)'}`,
        borderRadius: '4px',                 // sharp — luxury streetwear
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: '3 / 4',               // portrait — apparel standard
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: hovered
          ? '0 12px 40px rgba(0,0,0,0.55)'
          : '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <Link
        to={`/products?category=${cat.slug}`}
        style={{ textDecoration: 'none', display: 'block', height: '100%', position: 'relative' }}
      >
        {/* ── Image area (top 75%) ── */}
        <div
          style={{
            height: '75%',
            overflow: 'hidden',
            position: 'relative',
            background: '#0A0A0A',
          }}
        >
          {showImage ? (
            <img
              src={imageUrl}
              alt={cat.name}
              loading="lazy"
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                opacity: hovered ? 0.9 : 0.8,
              }}
            />
          ) : (
            <CategoryFallback name={cat.name} />
          )}

          {/* Bottom gradient for text legibility */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.65) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* ── Body (bottom 25%) ── */}
        <div
          style={{
            height: '25%',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '5px',
            background: '#111111',
            borderTop: '1px solid rgba(216,210,194,0.08)',
            transition: 'background 0.3s ease',
          }}
        >
          {/* Category name */}
          <p
            style={{
              margin: 0,
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '17px',
              letterSpacing: '2px',
              color: '#FFFFFF',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cat.name}
          </p>

          {/* Meta line */}
          <p
            style={{
              margin: 0,
              fontFamily: 'Inter, sans-serif',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: hovered ? '#B89B5E' : 'rgba(216,210,194,0.45)',
              transition: 'color 0.3s ease',
            }}
          >
            {metaLine}
            {!subcatCount && (
              <span
                style={{
                  display: 'inline-block',
                  marginLeft: '4px',
                  transform: hovered ? 'translateX(3px)' : 'translateX(0)',
                  transition: 'transform 0.25s ease',
                }}
              >
                →
              </span>
            )}
          </p>
        </div>

        {/* ── Gold hover line — top edge ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: '#B89B5E',
            transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: 'left',
            transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
          }}
        />
      </Link>
    </Motion.div>
  );
}