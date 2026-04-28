import api from './api';

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateStock(product) {
  if (!Array.isArray(product?.variants)) {
    return product?.in_stock ? 1 : 0;
  }

  return product.variants.reduce((sum, variant) => {
    const qty = variant?.stock?.quantity ?? 0;
    return sum + parseNumber(qty, 0);
  }, 0);
}

function mapProduct(product) {
  const imageUrl = product?.images?.[0]?.image || product?.main_image || '';

  return {
    id: product.id,
    name: product.name,
    price: parseNumber(product.base_price, 0),
    stock: calculateStock(product),
    imageUrl,
    category: product.category,
    description: product.description || '',
    isFeatured: Boolean(product.is_featured),
    isActive: product.is_active !== false,
    variants: Array.isArray(product.variants) ? product.variants : [],
  };
}

function buildProductPayload(payload) {
  return {
    name: payload.name.trim(),
    category: payload.categoryId ? Number(payload.categoryId) : null,
    description: payload.description?.trim() || '',
    base_price: parseNumber(payload.price, 0),
    is_active: payload.isActive !== false,
    is_featured: Boolean(payload.isFeatured),
  };
}

async function createDefaultVariantIfMissing(productId, payload, existingVariants = []) {
  const quantity = Math.max(0, Math.floor(parseNumber(payload.stock, 0)));
  const skuBase = payload.name?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-') || `PRODUCT-${productId}`;

  if (existingVariants.length > 0) {
    return;
  }

  await api.post(`/products/admin/products/${productId}/add_variant/`, {
    name: 'Default',
    sku: `${skuBase}-${Date.now()}`,
    price_override: null,
    is_active: true,
    stock_quantity: quantity,
  });
}


export async function getProductCategories() {
  try {
    const response = await api.get('/products/');
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to load categories.');
  }
}

export async function getProducts() {
  try {
    const response = await api.get('/products/admin/products/');
    return response.data.map(mapProduct);
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to load products.');
  }
}

export async function createProduct(payload) {
  try {
    const response = await api.post('/products/admin/products/', buildProductPayload(payload));
    await createDefaultVariantIfMissing(response.data.id, payload, response.data.variants);
    const latest = await api.get(`/products/admin/products/${response.data.id}/`);
    return mapProduct(latest.data);
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to create product.');
  }
}

export async function updateProduct(productId, payload) {
  try {
    const existingResponse = await api.get(`/products/admin/products/${productId}/`);
    const existing = existingResponse.data;

    await api.patch(`/products/admin/products/${productId}/`, buildProductPayload(payload));
    await createDefaultVariantIfMissing(productId, payload, existing.variants || []);

    const latest = await api.get(`/products/admin/products/${productId}/`);
    return mapProduct(latest.data);
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to update product.');
  }
}

export async function deleteProduct(productId) {
  try {
    await api.delete(`/products/admin/products/${productId}/`);
    return { success: true };
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to delete product.');
  }
}

export async function uploadProductImage(productId, file) {
  if (!file || !productId) {
    throw new Error('Missing image file or product id.');
  }

  const formData = new FormData();
  formData.append('image', file);
  formData.append('alt_text', file.name);
  formData.append('is_main', 'true');

  try {
    const response = await api.post(`/products/admin/products/${productId}/upload_image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      imageUrl: response.data.image,
      fileName: file.name,
    };
  } catch (error) {
    throw new Error(error?.response?.data?.detail || 'Unable to upload image.');
  }
}