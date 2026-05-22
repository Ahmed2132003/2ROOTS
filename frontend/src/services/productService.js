import apiClient from './api';

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureArrayPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function calculateStock(product) {
  if (!Array.isArray(product?.variants)) return product?.in_stock ? 1 : 0;
  return product.variants.reduce((sum, variant) => sum + parseNumber(variant?.stock?.quantity ?? variant?.stock_quantity, 0), 0);
}

function getPrimaryImage(product) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images.find((image) => image?.is_primary || image?.is_main)?.image || product.images[0]?.image || '';
  }
  return product?.main_image || '';
}

function mapProduct(product) {
  return {
    id: product.id,
    name: product.name,
    price: parseNumber(product.base_price, 0),
    stock: calculateStock(product),
    imageUrl: getPrimaryImage(product),
    images: Array.isArray(product.images) ? product.images : [],
    category: product.category,
    description: product.description || '',
    hasVariants: Boolean(product.has_variants),
    isFeatured: Boolean(product.is_featured),
    isActive: product.is_active !== false,
    stockStatus: product.stock_status || 'in_stock',
    discountType: product.discount_type || 'none',
    discountValue: parseNumber(product.discount_value, 0),
    discountActive: Boolean(product.discount_active),
    discountedPrice: product.discounted_price == null ? null : parseNumber(product.discounted_price, 0),
    discountPercentage: parseNumber(product.discount_percentage, 0),
    variants: Array.isArray(product.variants) ? product.variants : [],
  };
}

function buildVariantPayload(variant) {
  return {
    id: variant.id,
    color_id: variant.colorId || variant.color?.id || undefined,
    color_name: variant.colorName || variant.color?.name || '',
    hex_code: variant.hexCode || variant.color?.hex_code || '',
    size_id: variant.sizeId || variant.size?.id || undefined,
    size_name: variant.sizeName || variant.size?.name || '',
    price_override: variant.price === '' || variant.price == null ? null : parseNumber(variant.price, 0),
    stock_quantity: Math.max(0, Math.floor(parseNumber(variant.stock, variant.stock_quantity || 0))),
    sku: variant.sku?.trim() || null,
    is_active: variant.isActive !== false,
  };
}

function buildProductPayload(payload) {
  return {
    name: payload.name.trim(),
    category: payload.categoryId ? Number(payload.categoryId) : null,
    description: payload.description?.trim() || '',
    base_price: parseNumber(payload.price, 0),
    has_variants: Boolean(payload.hasVariants),
    is_active: payload.isActive !== false,
    is_featured: Boolean(payload.isFeatured),
    stock_status: payload.stockStatus || 'in_stock',
    discount_type: payload.discountType || 'none',
    discount_value: payload.discountType && payload.discountType !== 'none' ? parseNumber(payload.discountValue, 0) : 0,
    discount_active: Boolean(payload.discountActive),
    ...(payload.hasVariants ? { variants: (payload.variants || []).map(buildVariantPayload) } : {}),
  };
}

async function syncSimpleVariantStock(productId, payload, existingVariants = []) {
  if (payload.hasVariants) return;
  const firstVariant = existingVariants[0];
  const quantity = Math.max(0, Math.floor(parseNumber(payload.stock, 0)));
  if (!firstVariant?.id) return;
  await apiClient.patch(`/products/admin/products/${productId}/variants/${firstVariant.id}/`, {
    stock_quantity: quantity,
    price_override: null,
    is_active: true,
  });
}

async function createDefaultVariantIfMissing(productId, payload, existingVariants = []) {
  const quantity = Math.max(0, Math.floor(parseNumber(payload.stock, 0)));
  const skuBase = payload.name?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-') || `PRODUCT-${productId}`;

  if (payload.hasVariants || existingVariants.length > 0) return;

  await apiClient.post(`/products/admin/products/${productId}/add_variant/`, {
    name: 'Default',
    sku: `${skuBase}-${Date.now()}`,
    price_override: null,
    is_active: true,
    stock_quantity: quantity,
  });
}

export async function getProductCategories() {
  try {
    const response = await apiClient.get('/products/admin/categories/');
    return ensureArrayPayload(response.data);
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to load categories.');
  }
}

export async function getProducts() {
  try {
    const response = await apiClient.get('/products/admin/products/');
    return ensureArrayPayload(response.data).map(mapProduct);
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to load products.');
  }
}

export async function createProduct(payload) {
  try {
    const response = await apiClient.post('/products/admin/products/', buildProductPayload(payload));
    await createDefaultVariantIfMissing(response.data.id, payload, response.data.variants);
    const latest = await apiClient.get(`/products/admin/products/${response.data.id}/`);
    return mapProduct(latest.data);
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to create product.');
  }
}

export async function updateProduct(productId, payload) {
  try {
    const existingResponse = await apiClient.get(`/products/admin/products/${productId}/`);
    const existing = existingResponse.data;

    await apiClient.patch(`/products/admin/products/${productId}/`, buildProductPayload(payload));
    await createDefaultVariantIfMissing(productId, payload, existing.variants || []);
    await syncSimpleVariantStock(productId, payload, existing.variants || []);

    const latest = await apiClient.get(`/products/admin/products/${productId}/`);
    return mapProduct(latest.data);
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to update product.');
  }
}

export async function deleteProduct(productId) {
  try {
    await apiClient.delete(`/products/admin/products/${productId}/`);
    return { success: true };
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to delete product.');
  }
}

export async function uploadProductImage(productId, files, { isPrimary = true } = {}) {
  const fileList = Array.isArray(files) ? files : [files].filter(Boolean);
  if (!fileList.length || !productId) throw new Error('Missing image file or product id.');

  const formData = new FormData();
  fileList.forEach((file) => formData.append('images', file));
  formData.append('alt_text', fileList[0].name);
  formData.append('is_primary', String(isPrimary));
  formData.append('is_main', String(isPrimary));

  try {
    const response = await apiClient.post(`/products/admin/products/${productId}/images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to upload image.');
  }
}

export async function updateProductImage(productId, imageId, payload) {
  const response = await apiClient.patch(`/products/admin/products/${productId}/images/${imageId}/`, payload);
  return response.data;
}

export async function deleteProductImage(productId, imageId) {
  await apiClient.delete(`/products/admin/products/${productId}/images/${imageId}/`);
  return { success: true };
}

export async function createCategory(payload) {
  const hasImageFile = payload?.image instanceof File;
  if (hasImageFile) {
    const formData = new FormData();
    formData.append('name', payload.name || '');
    formData.append('is_active', String(payload.is_active !== false));
    formData.append('image', payload.image);
    const r = await apiClient.post('/products/admin/categories/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data;
  }
  const r = await apiClient.post('/products/admin/categories/', payload);
  return r.data;
}

export async function updateCategory(id, payload) {
  const hasImageFile = payload?.image instanceof File;
  if (hasImageFile) {
    const formData = new FormData();
    if (payload.name != null) formData.append('name', payload.name);
    if (payload.is_active != null) formData.append('is_active', String(payload.is_active));
    formData.append('image', payload.image);
    const r = await apiClient.patch(`/products/admin/categories/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data;
  }
  const r = await apiClient.patch(`/products/admin/categories/${id}/`, payload);
  return r.data;
}

export async function deleteCategory(id) {
  await apiClient.delete(`/products/admin/categories/${id}/`);
  return { success: true };
}