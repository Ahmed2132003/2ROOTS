// frontend/src/components/products/ProductFormModal.jsx
// 2ROOTS Dark Theme — Luxury Streetwear
// Design System: #0A0A0A bg · #111111 surface · #D8D2C2 stone · #2F4F3E green · #B89B5E gold
// Logic: 100% unchanged — only UI/styling rewritten

import { useMemo, useState } from 'react';

// ─── Default Values (unchanged) ───────────────────────────────────────────────
const defaultFormValues = {
  name: '',
  categoryId: '',
  description: '',
  price: '',
  stock: '',
  hasVariants: false,
  isFeatured: false,
  isActive: true,
  stockStatus: 'in_stock',
  discountType: 'none',
  discountValue: '',
  discountActive: false,
  imageFile: null,
  imageFiles: [],
  colors: [],
  sizes: [],
  variants: [],
};

// ─── Helpers (unchanged) ──────────────────────────────────────────────────────
function toVariantForm(variant) {
  return {
    id: variant.id,
    colorId: variant.color?.id || '',
    colorName: variant.color?.name || '',
    hexCode: variant.color?.hex_code || '',
    sizeId: variant.size?.id || '',
    sizeName: variant.size?.name || '',
    price: variant.price_override ?? '',
    stock: variant.stock?.quantity ?? variant.stock_quantity ?? 0,
    sku: variant.sku || '',
    isActive: variant.is_active !== false,
  };
}

function dedupeByName(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getInitialValues(initialProduct) {
  if (!initialProduct) return defaultFormValues;
  const variants = Array.isArray(initialProduct.variants)
    ? initialProduct.variants.map(toVariantForm)
    : [];
  const colors = dedupeByName(
    variants
      .filter((v) => v.colorName)
      .map((v) => ({ id: v.colorId, name: v.colorName, hexCode: v.hexCode }))
  );
  const sizes = dedupeByName(
    variants.filter((v) => v.sizeName).map((v) => ({ id: v.sizeId, name: v.sizeName }))
  );
  return {
    name: initialProduct.name,
    categoryId: initialProduct.category?.id ? String(initialProduct.category.id) : '',
    description: initialProduct.description || '',
    price: String(initialProduct.price),
    stock: String(
      initialProduct.hasVariants
        ? initialProduct.stock
        : (initialProduct.variants?.[0]?.stock?.quantity ?? initialProduct.stock)
    ),
    hasVariants: Boolean(initialProduct.hasVariants),
    isFeatured: Boolean(initialProduct.isFeatured),
    isActive: initialProduct.isActive !== false,
    stockStatus: initialProduct.stockStatus || 'in_stock',
    discountType: initialProduct.discountType || 'none',
    discountValue:
      initialProduct.discountValue != null ? String(initialProduct.discountValue) : '',
    discountActive: Boolean(initialProduct.discountActive),
    imageFile: null,
    imageFiles: [],
    colors,
    sizes,
    variants,
  };
}

function validateForm(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Name is required.';
  if (values.price === '' || Number(values.price) <= 0)
    errors.price = 'Price must be greater than 0.';
  if (
    !values.hasVariants &&
    (values.stock === '' ||
      Number(values.stock) < 0 ||
      !Number.isInteger(Number(values.stock)))
  )
    errors.stock = 'Stock must be a whole number 0 or greater.';
  if (
    values.hasVariants &&
    values.variants.some(
      (v) => v.stock === '' || Number(v.stock) < 0 || !Number.isInteger(Number(v.stock))
    )
  )
    errors.variants = 'Every variant needs a whole-number stock quantity.';
  return errors;
}

function buildCombinations(colors, sizes, existingVariants) {
  const safeColors = colors.length ? colors : [{ name: '', hexCode: '' }];
  const safeSizes = sizes.length ? sizes : [{ name: '' }];
  return safeColors.flatMap((color) =>
    safeSizes.map((size) => {
      const existing = existingVariants.find(
        (v) =>
          (v.colorName || '').toLowerCase() === (color.name || '').toLowerCase() &&
          (v.sizeName || '').toLowerCase() === (size.name || '').toLowerCase()
      );
      return (
        existing || {
          colorId: color.id || '',
          colorName: color.name || '',
          hexCode: color.hexCode || '',
          sizeId: size.id || '',
          sizeName: size.name || '',
          price: '',
          stock: 0,
          sku: '',
          isActive: true,
        }
      );
    })
  );
}

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: '#0A0A0A',
  surface: '#111111',
  surface2: '#161616',
  border: 'rgba(216, 210, 194, 0.10)',
  borderHover: 'rgba(216, 210, 194, 0.28)',
  borderGold: 'rgba(184, 155, 94, 0.60)',
  stone: '#D8D2C2',
  stoneMuted: 'rgba(216, 210, 194, 0.45)',
  white: '#FFFFFF',
  muted: 'rgba(217, 217, 217, 0.50)',
  gold: '#B89B5E',
  green: '#2F4F3E',
  danger: 'rgba(220, 60, 60, 0.80)',
  dangerBorder: 'rgba(220, 60, 60, 0.35)',
  radius: '2px',
  fontHead: 'Bebas Neue, sans-serif',
  fontBody: 'Inter, sans-serif',
};

// ─── Primitive UI Components ───────────────────────────────────────────────────

function Label({ children }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: T.stone,
        opacity: 0.6,
        fontFamily: T.fontBody,
        marginBottom: '6px',
      }}
    >
      {children}
    </span>
  );
}

function ErrorMsg({ children }) {
  return (
    <span
      role="alert"
      style={{
        display: 'block',
        marginTop: '5px',
        fontSize: '11px',
        color: '#e05555',
        fontFamily: T.fontBody,
        letterSpacing: '0.3px',
      }}
    >
      {children}
    </span>
  );
}

function FormField({ label, id, error, children, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      <label htmlFor={id}>
        <Label>{label}</Label>
      </label>
      {children}
      {error && <ErrorMsg>{error}</ErrorMsg>}
    </div>
  );
}

function inputStyle(focused = false) {
  return {
    width: '100%',
    background: T.bg,
    border: `1px solid ${focused ? T.borderGold : T.border}`,
    borderRadius: T.radius,
    padding: '9px 12px',
    fontSize: '13px',
    color: T.white,
    fontFamily: T.fontBody,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
    appearance: 'none',
    WebkitAppearance: 'none',
  };
}

function StyledInput({ id, type = 'text', value, onChange, placeholder, min, step, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      step={step}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={inputStyle(focused)}
    />
  );
}

function StyledSelect({ id, value, onChange, disabled, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle(focused),
          paddingRight: '28px',
          cursor: 'pointer',
        }}
      >
        {children}
      </select>
      <span
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: T.stoneMuted,
          fontSize: '10px',
        }}
      >
        ▾
      </span>
    </div>
  );
}

function StyledTextarea({ id, value, onChange, rows, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle(focused),
        resize: 'vertical',
        lineHeight: 1.6,
      }}
    />
  );
}

// Custom toggle — green when on
function Toggle({ id, checked, onChange, label }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: '10px 12px',
      }}
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.8px',
          color: T.stone,
          fontFamily: T.fontBody,
        }}
      >
        {label}
      </span>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        onClick={onChange}
        style={{
          position: 'relative',
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          border: `1px solid ${checked ? 'rgba(47,79,62,0.9)' : T.border}`,
          background: checked ? T.green : 'rgba(10,10,10,0.8)',
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
            background: checked ? T.stone : 'rgba(216,210,194,0.3)',
            transition: 'left 0.25s ease, background 0.25s ease',
          }}
        />
      </button>
    </div>
  );
}

// Section heading inside modal
function SectionHeading({ children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: '4px 0 16px',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          color: T.stone,
          fontFamily: T.fontBody,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: T.border }} />
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', background: T.border, margin: '4px 0' }} />;
}

// Color / size chip
function Chip({ label, color, onRemove }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onRemove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: hovered ? 'rgba(220,60,60,0.08)' : T.surface2,
        border: `1px solid ${hovered ? T.dangerBorder : T.border}`,
        borderRadius: T.radius,
        padding: '4px 10px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '1px',
        color: hovered ? '#e05555' : T.stone,
        fontFamily: T.fontBody,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {color && (
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: color,
            border: '1px solid rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        />
      )}
      {label}
      <span style={{ opacity: 0.6, fontSize: '10px' }}>×</span>
    </button>
  );
}

// Variant table input (compact)
function VariantInput({ value, onChange, type = 'text', placeholder, min, step }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      step={step}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        background: T.bg,
        border: `1px solid ${focused ? T.borderGold : T.border}`,
        borderRadius: T.radius,
        padding: '6px 8px',
        fontSize: '12px',
        color: T.white,
        fontFamily: T.fontBody,
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box',
      }}
    />
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────
export default function ProductFormModal({
  isOpen,
  mode,
  categories,
  categoriesLoading,
  initialProduct,
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const safeCategories = Array.isArray(categories) ? categories : [];
  const [values, setValues] = useState(() => getInitialValues(initialProduct));
  const [errors, setErrors] = useState({});
  const [imageFileName, setImageFileName] = useState('');
  const [newColor, setNewColor] = useState({ name: '', hexCode: '#000000' });
  const [newSize, setNewSize] = useState('');

  const title = useMemo(
    () => (mode === 'edit' ? 'EDIT PRODUCT' : 'ADD PRODUCT'),
    [mode]
  );

  if (!isOpen) return null;

  const handleChange = (field, value) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const setHasVariants = (checked) => {
    setValues((prev) => ({
      ...prev,
      hasVariants: checked,
      variants:
        checked && prev.variants.length === 0
          ? buildCombinations(prev.colors, prev.sizes, prev.variants)
          : prev.variants,
    }));
  };

  const addColor = () => {
    const name = newColor.name.trim();
    if (!name) return;
    setValues((prev) => {
      const colors = dedupeByName([...prev.colors, { name, hexCode: newColor.hexCode }]);
      return { ...prev, colors, variants: buildCombinations(colors, prev.sizes, prev.variants) };
    });
    setNewColor({ name: '', hexCode: '#000000' });
  };

  const removeColor = (name) =>
    setValues((prev) => {
      const colors = prev.colors.filter((c) => c.name !== name);
      return { ...prev, colors, variants: buildCombinations(colors, prev.sizes, prev.variants) };
    });

  const addSize = () => {
    const name = newSize.trim();
    if (!name) return;
    setValues((prev) => {
      const sizes = dedupeByName([...prev.sizes, { name }]);
      return { ...prev, sizes, variants: buildCombinations(prev.colors, sizes, prev.variants) };
    });
    setNewSize('');
  };

  const removeSize = (name) =>
    setValues((prev) => {
      const sizes = prev.sizes.filter((s) => s.name !== name);
      return { ...prev, sizes, variants: buildCombinations(prev.colors, sizes, prev.variants) };
    });

  const updateVariant = (index, field, value) =>
    setValues((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    }));

  const removeVariant = (index) =>
    setValues((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm(values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    await onSubmit(values);
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    setValues((prev) => ({ ...prev, imageFile: files[0] || null, imageFiles: files }));
    setImageFileName(files.map((f) => f.name).join(', '));
  };

  const existingImages = Array.isArray(initialProduct?.images) ? initialProduct.images : [];

  return (
    /* ── Backdrop ── */
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 16px',
        overflowY: 'auto',
      }}
    >
      {/* ── Modal Panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: `1px solid ${T.border}`,
            background: T.bg,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontFamily: T.fontHead,
              letterSpacing: '3px',
              color: T.white,
            }}
          >
            {title}
          </h3>
          <CloseButton onClick={onClose} />
        </header>

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 120px)',
          }}
        >
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Toggles row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Toggle
                id="has-variants"
                checked={values.hasVariants}
                onChange={() => setHasVariants(!values.hasVariants)}
                label="Has Variants"
              />
              <Toggle
                id="discount-active"
                checked={values.discountActive}
                onChange={() => handleChange('discountActive', !values.discountActive)}
                label="Discount Active"
              />
            </div>

            <Divider />

            {/* ── Core Info ── */}
            <SectionHeading>Product Info</SectionHeading>

            <FormField label="Product Name" id="product-name" error={errors.name}>
              <StyledInput
                id="product-name"
                value={values.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter product name"
              />
            </FormField>

            <FormField label="Category" id="product-category">
              <StyledSelect
                id="product-category"
                value={values.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                disabled={categoriesLoading}
              >
                <option value="">Uncategorized</option>
                {safeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}
                    style={{ background: '#111111' }}>
                    {cat.name}
                  </option>
                ))}
              </StyledSelect>
            </FormField>

            <FormField label="Description" id="product-description">
              <StyledTextarea
                id="product-description"
                value={values.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                placeholder="Write a short product description"
              />
            </FormField>

            <Divider />

            {/* ── Pricing & Stock ── */}
            <SectionHeading>Pricing & Stock</SectionHeading>

            <div style={{ display: 'grid', gridTemplateColumns: values.hasVariants ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <FormField label="Base Price (EGP)" id="product-price" error={errors.price}>
                <StyledInput
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                />
              </FormField>

              {!values.hasVariants && (
                <FormField label="Stock Quantity" id="product-stock" error={errors.stock}>
                  <StyledInput
                    id="product-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={values.stock}
                    onChange={(e) => handleChange('stock', e.target.value)}
                  />
                </FormField>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: values.discountType !== 'none' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
              <FormField label="Stock Status" id="product-stock-status">
                <StyledSelect
                  id="product-stock-status"
                  value={values.stockStatus}
                  onChange={(e) => handleChange('stockStatus', e.target.value)}
                >
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="sold_out">Sold Out</option>
                </StyledSelect>
              </FormField>

              <FormField label="Discount Type" id="product-discount-type">
                <StyledSelect
                  id="product-discount-type"
                  value={values.discountType}
                  onChange={(e) => handleChange('discountType', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount</option>
                </StyledSelect>
              </FormField>

              {values.discountType !== 'none' && (
                <FormField label="Discount Value" id="product-discount-value">
                  <StyledInput
                    id="product-discount-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.discountValue}
                    onChange={(e) => handleChange('discountValue', e.target.value)}
                  />
                </FormField>
              )}
            </div>

            <Divider />

            {/* ── Images ── */}
            <SectionHeading>Images</SectionHeading>

            <FormField
              label={values.hasVariants ? 'Upload Images' : 'Upload Image'}
              id="product-image-upload"
            >
              <FileUpload
                id="product-image-upload"
                multiple={values.hasVariants}
                onChange={handleImageChange}
                fileName={imageFileName}
                existingCount={existingImages.length}
              />
            </FormField>

            {/* ── Variants ── */}
            {values.hasVariants && (
              <>
                <Divider />
                <SectionHeading>Variant Options</SectionHeading>

                {/* Colors */}
                <div>
                  <Label>Colors</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'flex-end' }}>
                    <StyledInput
                      value={newColor.name}
                      onChange={(e) => setNewColor((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Color name (e.g. Black)"
                    />
                    <input
                      type="color"
                      value={newColor.hexCode}
                      onChange={(e) => setNewColor((p) => ({ ...p, hexCode: e.target.value }))}
                      style={{
                        width: '42px',
                        height: '40px',
                        border: `1px solid ${T.border}`,
                        borderRadius: T.radius,
                        background: T.bg,
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    />
                    <GhostButton onClick={addColor}>+ Add</GhostButton>
                  </div>
                  {values.colors.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                      {values.colors.map((c) => (
                        <Chip key={c.name} label={c.name} color={c.hexCode} onRemove={() => removeColor(c.name)} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Sizes */}
                <div>
                  <Label>Sizes</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                    <StyledInput
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      placeholder="Size (e.g. M, L, 42)"
                    />
                    <GhostButton onClick={addSize}>+ Add</GhostButton>
                  </div>
                  {values.sizes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                      {values.sizes.map((s) => (
                        <Chip key={s.name} label={s.name} onRemove={() => removeSize(s.name)} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Variants Table */}
                {values.variants.length > 0 && (
                  <div>
                    <Label>Variant Stock & Pricing</Label>
                    {errors.variants && <ErrorMsg>{errors.variants}</ErrorMsg>}
                    <div style={{ overflowX: 'auto', borderRadius: T.radius, border: `1px solid ${T.border}` }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                            {['Color', 'Size', 'Price Override', 'Stock', 'SKU', ''].map((h) => (
                              <th
                                key={h}
                                style={{
                                  padding: '10px 12px',
                                  textAlign: 'left',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  letterSpacing: '2px',
                                  textTransform: 'uppercase',
                                  color: T.stone,
                                  opacity: 0.55,
                                  fontFamily: T.fontBody,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {values.variants.map((variant, idx) => (
                            <tr
                              key={`${variant.colorName}-${variant.sizeName}-${idx}`}
                              style={{
                                borderBottom: `1px solid ${T.border}`,
                                background: idx % 2 === 0 ? T.surface : T.surface2,
                              }}
                            >
                              <td style={{ padding: '8px 12px', color: T.stone, fontFamily: T.fontBody }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {variant.hexCode && (
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: variant.hexCode, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                                  )}
                                  {variant.colorName || '—'}
                                </div>
                              </td>
                              <td style={{ padding: '8px 12px', color: T.stone, fontFamily: T.fontBody }}>
                                {variant.sizeName || '—'}
                              </td>
                              <td style={{ padding: '8px 10px', minWidth: '100px' }}>
                                <VariantInput
                                  type="number" min="0" step="0.01"
                                  value={variant.price} placeholder="Base"
                                  onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '8px 10px', minWidth: '80px' }}>
                                <VariantInput
                                  type="number" min="0" step="1"
                                  value={variant.stock}
                                  onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '8px 10px', minWidth: '100px' }}>
                                <VariantInput
                                  value={variant.sku} placeholder="SKU-001"
                                  onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <DangerButton onClick={() => removeVariant(idx)}>✕</DangerButton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            <Divider />

            {/* ── Flags ── */}
            <SectionHeading>Visibility</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Toggle
                id="is-featured"
                checked={values.isFeatured}
                onChange={() => handleChange('isFeatured', !values.isFeatured)}
                label="Featured"
              />
              <Toggle
                id="is-active"
                checked={values.isActive}
                onChange={() => handleChange('isActive', !values.isActive)}
                label="Active"
              />
            </div>

          </div>

          {/* ── Footer ── */}
          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '18px 24px',
              borderTop: `1px solid ${T.border}`,
              background: T.bg,
            }}
          >
            <GhostButton onClick={onClose} disabled={isSubmitting}>
              Cancel
            </GhostButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </PrimaryButton>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ─── Action Buttons ────────────────────────────────────────────────────────────
function CloseButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Close modal"
      style={{
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: `1px solid ${hovered ? T.borderHover : T.border}`,
        borderRadius: T.radius,
        color: hovered ? T.white : T.stoneMuted,
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      ×
    </button>
  );
}

function GhostButton({ onClick, disabled, children, type = 'button' }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'transparent',
        border: `1px solid ${hovered ? T.borderHover : T.border}`,
        borderRadius: T.radius,
        padding: '9px 18px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: hovered ? T.white : T.stone,
        fontFamily: T.fontBody,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, disabled, children, type = 'button' }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && !disabled ? T.stone : T.white,
        border: `1px solid ${T.white}`,
        borderRadius: T.radius,
        padding: '9px 24px',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: '#0A0A0A',
        fontFamily: T.fontBody,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function DangerButton({ onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(220,60,60,0.10)' : 'transparent',
        border: `1px solid ${hovered ? T.dangerBorder : T.border}`,
        borderRadius: T.radius,
        padding: '5px 10px',
        fontSize: '11px',
        color: hovered ? '#e05555' : T.stoneMuted,
        fontFamily: T.fontBody,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  );
}

// ─── File Upload ───────────────────────────────────────────────────────────────
function FileUpload({ id, multiple, onChange, fileName, existingCount }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: T.bg,
          border: `1px dashed ${hovered ? T.borderGold : T.border}`,
          borderRadius: T.radius,
          padding: '14px 16px',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease',
        }}
      >
        <span style={{ fontSize: '18px', opacity: 0.5 }}>↑</span>
        <span style={{ fontSize: '12px', color: T.stone, opacity: 0.65, fontFamily: T.fontBody }}>
          {fileName || (multiple ? 'Choose images...' : 'Choose image...')}
        </span>
        <input
          id={id}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={onChange}
          style={{ display: 'none' }}
        />
      </label>
      {existingCount > 0 && (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: T.stoneMuted, fontFamily: T.fontBody }}>
          {existingCount} existing image{existingCount > 1 ? 's' : ''} — primary shown on cards
        </p>
      )}
    </div>
  );
}