// frontend/src/components/products/ProductTable.jsx
// 2ROOTS Dark Theme — Luxury Streetwear
// Design System: #0A0A0A bg · #111111 surface · #D8D2C2 stone · #2F4F3E green · #B89B5E gold

import { useState } from 'react';

// ─── Currency formatter — EGP ──────────────────────────────────────────────────
const currencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const formatPrice = (price) => `${currencyFormatter.format(price)} EGP`;

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: '#0A0A0A',
  surface: '#111111',
  surface2: '#161616',
  border: 'rgba(216, 210, 194, 0.09)',
  borderHover: 'rgba(216, 210, 194, 0.22)',
  stone: '#D8D2C2',
  stoneMuted: 'rgba(216, 210, 194, 0.45)',
  white: '#FFFFFF',
  muted: 'rgba(217, 217, 217, 0.40)',
  gold: '#B89B5E',
  green: '#2F4F3E',
  dangerBg: 'rgba(220, 60, 60, 0.08)',
  dangerBorder: 'rgba(220, 60, 60, 0.35)',
  dangerText: '#e05555',
  radius: '2px',
  fontBody: 'Inter, sans-serif',
  fontHead: 'Bebas Neue, sans-serif',
};

// ─── Skeleton Row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[64, 180, 90, 60, 70, 100].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div
            style={{
              width: `${w}px`,
              height: i === 0 ? '52px' : '14px',
              background: 'rgba(216,210,194,0.06)',
              borderRadius: T.radius,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </td>
      ))}
    </tr>
  );
}

function ProductTableSkeleton() {
  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <TableShell>
        {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
      </TableShell>
    </>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyProductsState({ onAddProduct }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '64px 24px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
      }}
    >
      {/* Icon area */}
      <div
        style={{
          width: '56px',
          height: '56px',
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          color: T.stoneMuted,
          background: T.bg,
        }}
      >
        ☐
      </div>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            color: T.stone,
            fontFamily: T.fontBody,
          }}
        >
          No products yet
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: T.muted,
            fontFamily: T.fontBody,
          }}
        >
          Add your first product to get started.
        </p>
      </div>

      <button
        type="button"
        onClick={onAddProduct}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? T.stone : T.white,
          border: `1px solid ${T.white}`,
          borderRadius: T.radius,
          padding: '9px 22px',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          color: T.bg,
          fontFamily: T.fontBody,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        + Add Product
      </button>
    </div>
  );
}

// ─── Table Shell (shared between skeleton & data) ──────────────────────────────
function TableShell({ children }) {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        background: T.surface,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
          fontFamily: T.fontBody,
        }}
      >
        <thead>
          <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
            {['Image', 'Product', 'Price', 'Stock', 'Type', 'Actions'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '2.5px',
                  textTransform: 'uppercase',
                  color: T.stone,
                  opacity: 0.55,
                  fontFamily: T.fontBody,
                  whiteSpace: 'nowrap',
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ─── Product Row ───────────────────────────────────────────────────────────────
function ProductRow({ product, onEditProduct, onDeleteProduct, isEven }) {
  const [rowHovered, setRowHovered] = useState(false);
  const [editHovered, setEditHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const stockStatus = product.stock_status || product.stockStatus || 'in_stock';
  const hasVariants = product.hasVariants || product.has_variants;
  const price = product.base_price ?? product.price;

  return (
    <tr
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
      style={{
        background: rowHovered
          ? 'rgba(216,210,194,0.03)'
          : isEven
            ? T.surface
            : T.surface2,
        borderBottom: `1px solid ${T.border}`,
        transition: 'background 0.15s ease',
      }}
    >
      {/* Image */}
      <td style={{ padding: '12px 16px', width: '72px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: T.radius,
            overflow: 'hidden',
            border: `1px solid ${T.border}`,
            background: T.bg,
            flexShrink: 0,
          }}
        >
          <img
            loading="lazy"
            src={
              imgError
                ? 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'52\' height=\'52\'%3E%3Crect width=\'52\' height=\'52\' fill=\'%230A0A0A\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23D8D2C2\' font-size=\'8\' text-anchor=\'middle\' dominant-baseline=\'middle\' opacity=\'.4\'%3ENO IMG%3C/text%3E%3C/svg%3E'
                : (product.imageUrl || product.main_image || product.image || '')
            }
            alt={product.name}
            width={52}
            height={52}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      </td>

      {/* Name + Category */}
      <td style={{ padding: '12px 16px', maxWidth: '260px' }}>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 700,
            color: T.white,
            fontFamily: T.fontBody,
            letterSpacing: '0.2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.name}
        </p>
        {product.category?.name && (
          <p
            style={{
              margin: '3px 0 0',
              fontSize: '10px',
              color: T.stoneMuted,
              fontFamily: T.fontBody,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            {product.category.name}
          </p>
        )}
      </td>

      {/* Price */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        {product.discount_is_active && product.discounted_price ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '11px',
                color: T.muted,
                textDecoration: 'line-through',
                fontFamily: T.fontBody,
              }}
            >
              {formatPrice(price)}
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: T.white,
                fontFamily: T.fontBody,
              }}
            >
              {formatPrice(product.discounted_price)}
            </span>
          </div>
        ) : (
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: T.white,
              fontFamily: T.fontBody,
            }}
          >
            {formatPrice(price)}
          </span>
        )}
      </td>

      {/* Stock */}
      <td style={{ padding: '12px 16px' }}>
        <StockBadge status={stockStatus} quantity={product.stock} />
      </td>

      {/* Type */}
      <td style={{ padding: '12px 16px' }}>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: hasVariants ? T.gold : T.stoneMuted,
            fontFamily: T.fontBody,
            border: `1px solid ${hasVariants ? 'rgba(184,155,94,0.35)' : T.border}`,
            borderRadius: T.radius,
            padding: '3px 8px',
          }}
        >
          {hasVariants ? 'Variants' : 'Simple'}
        </span>
      </td>

      {/* Actions */}
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Edit */}
          <button
            type="button"
            onClick={() => onEditProduct(product)}
            onMouseEnter={() => setEditHovered(true)}
            onMouseLeave={() => setEditHovered(false)}
            style={{
              background: 'transparent',
              border: `1px solid ${editHovered ? T.borderHover : T.border}`,
              borderRadius: T.radius,
              padding: '6px 12px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: editHovered ? T.white : T.stone,
              fontFamily: T.fontBody,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Edit
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDeleteProduct(product)}
            onMouseEnter={() => setDeleteHovered(true)}
            onMouseLeave={() => setDeleteHovered(false)}
            style={{
              background: deleteHovered ? T.dangerBg : 'transparent',
              border: `1px solid ${deleteHovered ? T.dangerBorder : T.border}`,
              borderRadius: T.radius,
              padding: '6px 12px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: deleteHovered ? T.dangerText : T.stoneMuted,
              fontFamily: T.fontBody,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Stock Badge ───────────────────────────────────────────────────────────────
function StockBadge({ status, quantity }) {
  const map = {
    in_stock:  { label: 'In Stock',   color: T.green,   border: 'rgba(47,79,62,0.6)',  text: T.stone },
    low_stock: { label: 'Low Stock',  color: 'rgba(47,79,62,0.35)', border: 'rgba(47,79,62,0.5)', text: T.stone },
    sold_out:  { label: 'Sold Out',   color: 'transparent', border: T.border, text: T.stoneMuted },
  };
  const s = map[status] || map.in_stock;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: s.color,
          border: `1px solid ${s.border}`,
          borderRadius: T.radius,
          padding: '3px 8px',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: s.text,
          fontFamily: T.fontBody,
          width: 'fit-content',
        }}
      >
        {status === 'in_stock' && (
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: T.stone, opacity: 0.8, flexShrink: 0 }} />
        )}
        {s.label}
      </span>
      {quantity != null && (
        <span style={{ fontSize: '10px', color: T.muted, fontFamily: T.fontBody, paddingLeft: '2px' }}>
          {quantity} units
        </span>
      )}
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function ProductTable({
  products,
  loading,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
}) {
  if (loading) return <ProductTableSkeleton />;
  if (!products?.length) return <EmptyProductsState onAddProduct={onAddProduct} />;

  return (
    <TableShell>
      {products.map((product, idx) => (
        <ProductRow
          key={product.id}
          product={product}
          isEven={idx % 2 === 0}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
        />
      ))}
    </TableShell>
  );
}