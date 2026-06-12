// frontend/src/components/products/FiltersPanel.jsx
// 2ROOTS Dark Theme — Luxury Streetwear
// Design System: #0A0A0A bg · #111111 surface · #D8D2C2 stone · #2F4F3E green · #B89B5E gold (active)

import { useState } from 'react';
import { motion as Motion } from 'framer-motion';

const defaultFilters = {
  category: '',
  min_price: '',
  max_price: '',
  in_stock: false,
  search: '',
  ordering: '-created_at',
};

// ─── Shared input style ────────────────────────────────────────────────────────
const inputBase = {
  width: '100%',
  background: '#0A0A0A',
  border: '1px solid rgba(216, 210, 194, 0.12)',
  borderRadius: '2px',
  padding: '9px 12px',
  fontSize: '13px',
  color: '#FFFFFF',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  boxSizing: 'border-box',
  appearance: 'none',
  WebkitAppearance: 'none',
};

// ─── Controlled input with focus border ───────────────────────────────────────
function StyledInput({ placeholder, value, onChange, type = 'text' }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputBase,
        borderColor: focused
          ? 'rgba(184, 155, 94, 0.6)'   // gold on focus
          : 'rgba(216, 210, 194, 0.12)',
        color: '#FFFFFF',
      }}
    />
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p
      style={{
        margin: '0 0 10px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        color: '#D8D2C2',
        opacity: 0.55,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {children}
    </p>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      style={{
        height: '1px',
        background: 'rgba(216, 210, 194, 0.08)',
        margin: '0',
      }}
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FiltersPanel({ filters, setFilters, categories, isRTL, t }) {
  const categoryList = Array.isArray(categories)
    ? categories
    : Array.isArray(categories?.results)
      ? categories.results
      : [];

  const resetFilters = () => setFilters(defaultFilters);

  const allCategories = [
    { slug: '', name: isRTL ? 'الكل' : 'ALL' },
    ...categoryList,
  ];

  return (
    <aside
      style={{
        background: '#111111',
        border: '1px solid rgba(216, 210, 194, 0.10)',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'sticky',
        top: '96px',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(216, 210, 194, 0.08)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {t('products.filter')}
        </h3>

        <ResetButton onClick={resetFilters} isRTL={isRTL} />
      </div>

      {/* ── Sections ── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Categories */}
        <section style={{ padding: '20px 20px 18px' }}>
          <SectionLabel>{t('home.categories')}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {allCategories.map((cat) => {
              const isActive = filters.category === cat.slug;
              return (
                <Motion.button
                  key={cat.slug || 'all'}
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, category: cat.slug }))
                  }
                  whileHover={{ x: isRTL ? -3 : 3 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    width: '100%',
                    background: isActive
                      ? 'rgba(184, 155, 94, 0.08)'
                      : 'transparent',
                    border: '1px solid',
                    borderColor: isActive
                      ? 'rgba(184, 155, 94, 0.55)'    // gold when active
                      : 'rgba(216, 210, 194, 0.10)',
                    borderRadius: '2px',
                    padding: '9px 12px',
                    textAlign: isRTL ? 'right' : 'left',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: isActive ? '1.5px' : '0.5px',
                    textTransform: 'uppercase',
                    color: isActive ? '#B89B5E' : '#D9D9D9',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {cat.name}
                </Motion.button>
              );
            })}
          </div>
        </section>

        <Divider />

        {/* Price Range */}
        <section style={{ padding: '20px 20px 18px' }}>
          <SectionLabel>{t('products.price')}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <StyledInput
              type="number"
              placeholder={isRTL ? 'من' : 'MIN'}
              value={filters.min_price}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, min_price: e.target.value }))
              }
            />
            <StyledInput
              type="number"
              placeholder={isRTL ? 'إلى' : 'MAX'}
              value={filters.max_price}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, max_price: e.target.value }))
              }
            />
          </div>
        </section>

        <Divider />

        {/* In Stock Toggle */}
        <section style={{ padding: '18px 20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              gap: '12px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#D9D9D9',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {t('products.in_stock')}
            </span>
            <Toggle
              checked={filters.in_stock}
              onChange={() =>
                setFilters((prev) => ({ ...prev, in_stock: !prev.in_stock }))
              }
            />
          </label>
        </section>

        <Divider />

        {/* Sort */}
        <section style={{ padding: '20px 20px 18px' }}>
          <SectionLabel>{isRTL ? 'ترتيب' : 'SORT BY'}</SectionLabel>
          <SortSelect
            value={filters.ordering}
            onChange={(val) =>
              setFilters((prev) => ({ ...prev, ordering: val }))
            }
            isRTL={isRTL}
          />
        </section>

      </div>
    </aside>
  );
}

// ─── Reset Button ──────────────────────────────────────────────────────────────
function ResetButton({ onClick, isRTL }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'transparent',
        border: '1px solid',
        borderColor: hovered
          ? 'rgba(216, 210, 194, 0.45)'
          : 'rgba(216, 210, 194, 0.18)',
        borderRadius: '2px',
        padding: '5px 10px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: hovered ? '#D8D2C2' : 'rgba(216, 210, 194, 0.5)',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {isRTL ? 'إعادة ضبط' : 'RESET'}
    </button>
  );
}

// ─── Custom Toggle ─────────────────────────────────────────────────────────────
// No accent-indigo — uses deep green (#2F4F3E) when active
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        position: 'relative',
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        border: '1px solid',
        borderColor: checked
          ? 'rgba(47, 79, 62, 0.9)'
          : 'rgba(216, 210, 194, 0.2)',
        background: checked ? '#2F4F3E' : 'rgba(10,10,10,0.8)',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '17px' : '3px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: checked ? '#D8D2C2' : 'rgba(216, 210, 194, 0.35)',
          transition: 'left 0.25s ease, background 0.25s ease',
        }}
      />
    </button>
  );
}

// ─── Sort Select ───────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: '-created_at', labelEn: 'NEWEST',       labelAr: 'الأحدث' },
  { value: 'created_at',  labelEn: 'OLDEST',       labelAr: 'الأقدم' },
  { value: 'base_price',  labelEn: 'PRICE: LOW',   labelAr: 'السعر: الأقل' },
  { value: '-base_price', labelEn: 'PRICE: HIGH',  labelAr: 'السعر: الأعلى' },
  { value: 'name',        labelEn: 'NAME: A→Z',    labelAr: 'الاسم: أ→ي' },
  { value: '-name',       labelEn: 'NAME: Z→A',    labelAr: 'الاسم: ي→أ' },
];

function SortSelect({ value, onChange, isRTL }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputBase,
          borderColor: focused
            ? 'rgba(184, 155, 94, 0.6)'
            : 'rgba(216, 210, 194, 0.12)',
          cursor: 'pointer',
          paddingRight: '32px',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}
            style={{ background: '#111111', color: '#FFFFFF' }}
          >
            {isRTL ? opt.labelAr : opt.labelEn}
          </option>
        ))}
      </select>
      {/* Chevron icon */}
      <span
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'rgba(216,210,194,0.45)',
          fontSize: '10px',
        }}
      >
        ▾
      </span>
    </div>
  );
}