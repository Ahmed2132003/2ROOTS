import { useMemo, useState } from 'react';

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

function FormField({ label, id, error, children }) {
  return (
    <label className="product-modal__field" htmlFor={id}>
      <span>{label}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}

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

  const variants = Array.isArray(initialProduct.variants) ? initialProduct.variants.map(toVariantForm) : [];
  const colors = dedupeByName(variants.filter((v) => v.colorName).map((v) => ({ id: v.colorId, name: v.colorName, hexCode: v.hexCode })));
  const sizes = dedupeByName(variants.filter((v) => v.sizeName).map((v) => ({ id: v.sizeId, name: v.sizeName })));

  return {
    name: initialProduct.name,
    categoryId: initialProduct.category?.id ? String(initialProduct.category.id) : '',
    description: initialProduct.description || '',
    price: String(initialProduct.price),
    stock: String(initialProduct.hasVariants ? initialProduct.stock : (initialProduct.variants?.[0]?.stock?.quantity ?? initialProduct.stock)),
    hasVariants: Boolean(initialProduct.hasVariants),
    isFeatured: Boolean(initialProduct.isFeatured),
    isActive: initialProduct.isActive !== false,
    stockStatus: initialProduct.stockStatus || 'in_stock',
    discountType: initialProduct.discountType || 'none',
    discountValue: initialProduct.discountValue != null ? String(initialProduct.discountValue) : '',
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
  if (values.price === '' || Number(values.price) <= 0) errors.price = 'Price must be greater than 0.';
  if (!values.hasVariants && (values.stock === '' || Number(values.stock) < 0 || !Number.isInteger(Number(values.stock)))) {
    errors.stock = 'Stock must be a whole number 0 or greater.';
  }
  if (values.hasVariants && values.variants.some((variant) => variant.stock === '' || Number(variant.stock) < 0 || !Number.isInteger(Number(variant.stock)))) {
    errors.variants = 'Every variant needs a whole-number stock quantity.';
  }
  return errors;
}

function buildCombinations(colors, sizes, existingVariants) {
  const safeColors = colors.length ? colors : [{ name: '', hexCode: '' }];
  const safeSizes = sizes.length ? sizes : [{ name: '' }];
  return safeColors.flatMap((color) => safeSizes.map((size) => {
    const existing = existingVariants.find((variant) => (
      (variant.colorName || '').toLowerCase() === (color.name || '').toLowerCase() &&
      (variant.sizeName || '').toLowerCase() === (size.name || '').toLowerCase()
    ));
    return existing || {
      colorId: color.id || '',
      colorName: color.name || '',
      hexCode: color.hexCode || '',
      sizeId: size.id || '',
      sizeName: size.name || '',
      price: '',
      stock: 0,
      sku: '',
      isActive: true,
    };
  }));
}

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

  const title = useMemo(() => (mode === 'edit' ? 'Edit Product' : 'Add Product'), [mode]);

  if (!isOpen) return null;

  const handleChange = (field, value) => setValues((prev) => ({ ...prev, [field]: value }));

  const setHasVariants = (checked) => {
    setValues((prev) => ({
      ...prev,
      hasVariants: checked,
      variants: checked && prev.variants.length === 0 ? buildCombinations(prev.colors, prev.sizes, prev.variants) : prev.variants,
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

  const removeColor = (name) => setValues((prev) => {
    const colors = prev.colors.filter((color) => color.name !== name);
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

  const removeSize = (name) => setValues((prev) => {
    const sizes = prev.sizes.filter((size) => size.name !== name);
    return { ...prev, sizes, variants: buildCombinations(prev.colors, sizes, prev.variants) };
  });

  const updateVariant = (index, field, value) => setValues((prev) => ({
    ...prev,
    variants: prev.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant),
  }));

  const removeVariant = (index) => setValues((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));

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
    setImageFileName(files.map((file) => file.name).join(', '));
  };

  const existingImages = Array.isArray(initialProduct?.images) ? initialProduct.images : [];

  return (
    <div className="product-modal__backdrop" role="presentation" onClick={onClose}>
      <div className="product-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="product-modal__header">
          <h3>{title}</h3>
          <button className="product-modal__close" type="button" onClick={onClose} aria-label="Close modal">×</button>
        </header>

        <form className="product-modal__form" onSubmit={handleSubmit}>
          <label className="product-modal__field product-modal__field--toggle" htmlFor="has-variants">
            <span>This product has variants (colors, sizes)</span>
            <input id="has-variants" type="checkbox" checked={values.hasVariants} onChange={(event) => setHasVariants(event.target.checked)} />
          </label>
          <label className="product-modal__field product-modal__field--toggle" htmlFor="discount-active">
            <span>Discount active</span>
            <input id="discount-active" type="checkbox" checked={values.discountActive} onChange={(event) => handleChange('discountActive', event.target.checked)} />
          </label>

          <FormField label="Product Name" id="product-name" error={errors.name}>
            <input id="product-name" type="text" value={values.name} onChange={(event) => handleChange('name', event.target.value)} placeholder="Enter product name" />
          </FormField>

          <FormField label="Category" id="product-category">
            <select id="product-category" value={values.categoryId} onChange={(event) => handleChange('categoryId', event.target.value)} disabled={categoriesLoading}>
              <option value="">Uncategorized</option>
              {safeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </FormField>

          <FormField label="Description" id="product-description">
            <textarea id="product-description" value={values.description} onChange={(event) => handleChange('description', event.target.value)} rows={3} placeholder="Write a short product description" />
          </FormField>

          <div className="product-modal__row">
            <FormField label="Base Price" id="product-price" error={errors.price}>
              <input id="product-price" type="number" min="0" step="0.01" value={values.price} onChange={(event) => handleChange('price', event.target.value)} />
            </FormField>

            {!values.hasVariants && (
              <FormField label="Stock" id="product-stock" error={errors.stock}>
                <input id="product-stock" type="number" min="0" step="1" value={values.stock} onChange={(event) => handleChange('stock', event.target.value)} />
              </FormField>
            )}
          </div>
          <div className="product-modal__row">
            <FormField label="Stock Status" id="product-stock-status">
              <select id="product-stock-status" value={values.stockStatus} onChange={(event) => handleChange('stockStatus', event.target.value)}>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="sold_out">Sold Out</option>
              </select>
            </FormField>
            <FormField label="Discount Type" id="product-discount-type">
              <select id="product-discount-type" value={values.discountType} onChange={(event) => handleChange('discountType', event.target.value)}>
                <option value="none">None</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </FormField>
            {values.discountType !== 'none' && (
              <FormField label="Discount Value" id="product-discount-value">
                <input id="product-discount-value" type="number" min="0" step="0.01" value={values.discountValue} onChange={(event) => handleChange('discountValue', event.target.value)} />
              </FormField>
            )}
          </div>
          <FormField label={values.hasVariants ? 'Upload Images' : 'Upload Image'} id="product-image-upload">
            <input id="product-image-upload" type="file" accept="image/*" multiple={values.hasVariants} onChange={handleImageChange} />
            {imageFileName && <small className="product-modal__hint">Selected: {imageFileName}</small>}
            {existingImages.length > 0 && <small className="product-modal__hint">Existing images: {existingImages.length}. Primary image is used on product cards.</small>}
          </FormField>

          {values.hasVariants && (
            <section className="product-modal__variants">
              <h4>Variant Options</h4>
              <div className="product-modal__row">
                <FormField label="Color name" id="variant-color-name">
                  <input id="variant-color-name" value={newColor.name} onChange={(event) => setNewColor((prev) => ({ ...prev, name: event.target.value }))} placeholder="Red" />
                </FormField>
                <FormField label="Hex" id="variant-color-hex">
                  <input id="variant-color-hex" type="color" value={newColor.hexCode} onChange={(event) => setNewColor((prev) => ({ ...prev, hexCode: event.target.value }))} />
                </FormField>
                <button type="button" onClick={addColor}>Add Color</button>
              </div>
              <div className="product-modal__chips">
                {values.colors.map((color) => <button type="button" key={color.name} onClick={() => removeColor(color.name)}><span style={{ background: color.hexCode }} />{color.name} ×</button>)}
              </div>

              <div className="product-modal__row">
                <FormField label="Size" id="variant-size-name">
                  <input id="variant-size-name" value={newSize} onChange={(event) => setNewSize(event.target.value)} placeholder="M or 42" />
                </FormField>
                <button type="button" onClick={addSize}>Add Size</button>
              </div>
              <div className="product-modal__chips">
                {values.sizes.map((size) => <button type="button" key={size.name} onClick={() => removeSize(size.name)}>{size.name} ×</button>)}
              </div>

              {errors.variants && <small role="alert">{errors.variants}</small>}
              <div className="product-modal__variant-table">
                <table>
                  <thead><tr><th>Color</th><th>Size</th><th>Price override</th><th>Stock</th><th>SKU</th><th>Actions</th></tr></thead>
                  <tbody>
                    {values.variants.map((variant, index) => (
                      <tr key={`${variant.colorName}-${variant.sizeName}-${index}`}>
                        <td>{variant.colorName || 'Any'}</td>
                        <td>{variant.sizeName || 'Any'}</td>
                        <td><input type="number" min="0" step="0.01" value={variant.price} placeholder="Base" onChange={(event) => updateVariant(index, 'price', event.target.value)} /></td>
                        <td><input type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(index, 'stock', event.target.value)} /></td>
                        <td><input value={variant.sku} onChange={(event) => updateVariant(index, 'sku', event.target.value)} placeholder="SKU-001" /></td>
                        <td><button type="button" className="danger" onClick={() => removeVariant(index)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="product-modal__row">
            <label className="product-modal__field product-modal__field--toggle" htmlFor="is-featured"><span>Featured</span><input id="is-featured" type="checkbox" checked={values.isFeatured} onChange={(event) => handleChange('isFeatured', event.target.checked)} /></label>
            <label className="product-modal__field product-modal__field--toggle" htmlFor="is-active"><span>Active</span><input id="is-active" type="checkbox" checked={values.isActive} onChange={(event) => handleChange('isActive', event.target.checked)} /></label>
          </div>

          <footer className="product-modal__footer">
            <button type="button" className="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Product'}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}