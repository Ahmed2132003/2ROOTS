// frontend/src/components/products/ProductBadges.jsx
// 2ROOTS Dark Theme — Luxury Streetwear
// Design System: #0A0A0A bg · #D8D2C2 stone · #B89B5E gold · #2F4F3E green
// Philosophy: no gradients, no rounded pills, no neon — raw & minimal

// ─── Sold Out Badge ────────────────────────────────────────────────────────────
// White on dark — stark, intentional, no color drama
export function SoldOutBadge({ style = {} }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(10, 10, 10, 0.85)',
        border: '1px solid rgba(216, 210, 194, 0.55)',
        color: '#D8D2C2',
        borderRadius: '2px',
        padding: '5px 12px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '3px',
        textTransform: 'uppercase',
        fontFamily: 'Inter, sans-serif',
        backdropFilter: 'blur(4px)',
        ...style,
      }}
    >
      SOLD OUT
    </span>
  );
}

// ─── Low Stock Badge ───────────────────────────────────────────────────────────
// Deep green accent — subtle urgency without alarm
export function LowStockBadge({ quantity, style = {} }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(47, 79, 62, 0.75)',
        border: '1px solid rgba(47, 79, 62, 0.9)',
        color: '#D8D2C2',
        borderRadius: '2px',
        padding: '4px 9px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        fontFamily: 'Inter, sans-serif',
        backdropFilter: 'blur(4px)',
        ...style,
      }}
    >
      {/* Dot indicator */}
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: '#D8D2C2',
          flexShrink: 0,
          opacity: 0.8,
        }}
      />
      {quantity != null ? `ONLY ${quantity} LEFT` : 'LOW STOCK'}
    </span>
  );
}

// ─── Discount Badge ────────────────────────────────────────────────────────────
// Stone border, no fill — lets the number do the work
export function DiscountBadge({ percentage, style = {} }) {
  if (!percentage) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 10, 10, 0.85)',
        border: '1px solid rgba(184, 155, 94, 0.65)',
        color: '#B89B5E',
        borderRadius: '2px',
        padding: '4px 9px',
        fontSize: '9px',
        fontWeight: 800,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        fontFamily: 'Inter, sans-serif',
        backdropFilter: 'blur(4px)',
        ...style,
      }}
    >
      -{percentage}%
    </span>
  );
}

// ─── New Badge ─────────────────────────────────────────────────────────────────
// Optional — for newly added products
export function NewBadge({ style = {} }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#FFFFFF',
        color: '#0A0A0A',
        borderRadius: '2px',
        padding: '4px 9px',
        fontSize: '9px',
        fontWeight: 800,
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        fontFamily: 'Inter, sans-serif',
        ...style,
      }}
    >
      NEW
    </span>
  );
}

// ─── Price Display ─────────────────────────────────────────────────────────────
// Used in ProductDetail and anywhere a standalone price block is needed
// Sale price stays white (not red) — cleaner, more premium
export function PriceDisplay({
  basePrice,
  discountedPrice,
  discountIsActive,
  t,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const sizes = {
    sm: { regular: '16px', sale: '16px', original: '12px', currency: '10px' },
    md: { regular: '22px', sale: '22px', original: '14px', currency: '11px' },
    lg: { regular: '32px', sale: '32px', original: '16px', currency: '13px' },
  };
  const s = sizes[size] || sizes.md;

  const currencyStyle = {
    fontSize: s.currency,
    fontWeight: 600,
    color: '#D9D9D9',
    marginLeft: '4px',
    letterSpacing: '1px',
    fontFamily: 'Inter, sans-serif',
  };

  if (!discountIsActive) {
    return (
      <span
        style={{
          fontSize: s.regular,
          fontWeight: 900,
          color: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.3px',
          lineHeight: 1,
        }}
      >
        {Number(basePrice).toLocaleString()}
        <span style={currencyStyle}>{t('common.egp')}</span>
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {/* Original — struck through, muted */}
      <span
        style={{
          fontSize: s.original,
          color: 'rgba(217, 217, 217, 0.4)',
          textDecoration: 'line-through',
          textDecorationColor: 'rgba(217, 217, 217, 0.3)',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {Number(basePrice).toLocaleString()}
        <span style={{ marginLeft: '3px', letterSpacing: '1px' }}>
          {t('common.egp')}
        </span>
      </span>

      {/* Sale — white, bold */}
      <span
        style={{
          fontSize: s.sale,
          fontWeight: 900,
          color: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.3px',
          lineHeight: 1,
        }}
      >
        {Number(discountedPrice).toLocaleString()}
        <span style={currencyStyle}>{t('common.egp')}</span>
      </span>
    </div>
  );
}