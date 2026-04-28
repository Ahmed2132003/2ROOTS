import { useMemo, useState } from 'react';

const defaultFormValues = {
  name: '',
  categoryId: '',
  description: '',
  price: '',
  stock: '',
  isFeatured: false,
  isActive: true,
  imageFile: null,
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

function getInitialValues(initialProduct) {
  if (!initialProduct) {
    return defaultFormValues;
  }

  return {
    name: initialProduct.name,
    categoryId: initialProduct.category?.id ? String(initialProduct.category.id) : '',
    description: initialProduct.description || '',
    price: String(initialProduct.price),
    stock: String(initialProduct.stock),
    isFeatured: Boolean(initialProduct.isFeatured),
    isActive: initialProduct.isActive !== false,
    imageFile: null,
  };
}

function validateForm(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = 'Name is required.';
  }

  if (values.price === '' || Number(values.price) <= 0) {
    errors.price = 'Price must be greater than 0.';
  }

  if (values.stock === '' || Number(values.stock) < 0 || !Number.isInteger(Number(values.stock))) {
    errors.stock = 'Stock must be a whole number 0 or greater.';
  }

  return errors;
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
  const [values, setValues] = useState(() => getInitialValues(initialProduct));
  const [errors, setErrors] = useState({});
  const [imageFileName, setImageFileName] = useState('');

  const title = useMemo(() => (mode === 'edit' ? 'Edit Product' : 'Add Product'), [mode]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

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
    const file = event.target.files?.[0] || null;
    setValues((prev) => ({ ...prev, imageFile: file }));
    setImageFileName(file?.name || '');
  };

  return (
    <div className="product-modal__overlay" role="presentation" onClick={onClose}>
      <div className="product-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="product-modal__header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close modal">×</button>
        </header>

        <form className="product-modal__form" onSubmit={handleSubmit}>
          <FormField label="Product Name" id="product-name" error={errors.name}>
            <input
              id="product-name"
              type="text"
              value={values.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="Enter product name"
            />
          </FormField>

          <FormField label="Category" id="product-category">
            <select
              id="product-category"
              value={values.categoryId}
              onChange={(event) => handleChange('categoryId', event.target.value)}
              disabled={categoriesLoading}
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Description" id="product-description">
            <textarea
              id="product-description"
              value={values.description}
              onChange={(event) => handleChange('description', event.target.value)}
              rows={3}
              placeholder="Write a short product description"
            />
          </FormField>

          <div className="product-modal__row">
            <FormField label="Price" id="product-price" error={errors.price}>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={values.price}
                onChange={(event) => handleChange('price', event.target.value)}
              />
            </FormField>

            <FormField label="Stock" id="product-stock" error={errors.stock}>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                value={values.stock}
                onChange={(event) => handleChange('stock', event.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Upload Image" id="product-image-upload">
            <input
              id="product-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imageFileName && <small className="product-modal__hint">Selected: {imageFileName}</small>}
          </FormField>

          <div className="product-modal__row">
            <label className="product-modal__field" htmlFor="is-featured">
              <span>Featured</span>
              <input
                id="is-featured"
                type="checkbox"
                checked={values.isFeatured}
                onChange={(event) => handleChange('isFeatured', event.target.checked)}
              />
            </label>

            <label className="product-modal__field" htmlFor="is-active">
              <span>Active</span>
              <input
                id="is-active"
                type="checkbox"
                checked={values.isActive}
                onChange={(event) => handleChange('isActive', event.target.checked)}
              />
            </label>
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