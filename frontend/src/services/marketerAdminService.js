// frontend/src/services/marketerAdminService.js
// كل API calls الأدمن الخاصة بنظام المسوقين (Part A11).
// ملاحظة: المسارات هنا بدون '/api' لإن apiClient (./api) بيضيفه تلقائيًا من الـ baseURL،
// وبدون '/dashboard' أو '/marketers' المكرّرة — مطابقة لما هو موثّق في PROGRESS.md (Part A7/A11):
//   apps/marketers/dashboard_urls.py  → مركّبة تحت  /api/dashboard/
//   apps/marketers/urls.py            → مركّبة تحت  /api/marketers/

import apiClient from './api';

// ─────────────────────────────────────────────────────────────────────────
// إدارة المسوقين (قائمة + تفاصيل + حالة + ترقية)
// ─────────────────────────────────────────────────────────────────────────

export async function getMarketers(params) {
  const response = await apiClient.get('/dashboard/marketers/', { params });
  return response.data;
}

export async function getMarketerDetail(id) {
  const response = await apiClient.get(`/dashboard/marketers/${id}/`);
  return response.data;
}

export async function updateMarketerStatus(id, status) {
  const response = await apiClient.patch(`/dashboard/marketers/${id}/`, { status });
  return response.data;
}

export async function promoteMarketerToLeader(id) {
  const response = await apiClient.post(`/dashboard/marketers/${id}/promote-to-leader/`);
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// تسعير المسوق على المنتجات
// ─────────────────────────────────────────────────────────────────────────

export async function getMarketerProductPrices(marketerId) {
  const response = await apiClient.get(`/dashboard/marketers/${marketerId}/product-prices/`);
  return response.data;
}

export async function createMarketerProductPrice(marketerId, payload) {
  const response = await apiClient.post(`/dashboard/marketers/${marketerId}/product-prices/`, payload);
  return response.data;
}

export async function updateMarketerProductPrice(priceId, payload) {
  const response = await apiClient.patch(`/dashboard/marketer-product-prices/${priceId}/`, payload);
  return response.data;
}

export async function deleteMarketerProductPrice(priceId) {
  const response = await apiClient.delete(`/dashboard/marketer-product-prices/${priceId}/`);
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// مراجعة أوردرات المسوقين
// ─────────────────────────────────────────────────────────────────────────

export async function getMarketerOrders(params) {
  const response = await apiClient.get('/dashboard/marketer-orders/', { params });
  return response.data;
}

export async function confirmMarketerOrder(id) {
  const response = await apiClient.patch(`/dashboard/marketer-orders/${id}/confirm/`);
  return response.data;
}

export async function rejectMarketerOrder(id) {
  const response = await apiClient.patch(`/dashboard/marketer-orders/${id}/reject/`);
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// درجات المكافآت (Reward Tiers)
// ─────────────────────────────────────────────────────────────────────────

export async function getRewardTiers() {
  const response = await apiClient.get('/dashboard/reward-tiers/');
  return response.data;
}

export async function createRewardTier(payload) {
  const response = await apiClient.post('/dashboard/reward-tiers/', payload);
  return response.data;
}

export async function updateRewardTier(id, payload) {
  const response = await apiClient.patch(`/dashboard/reward-tiers/${id}/`, payload);
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// مكافآت قادة الفرق (Team Rewards)
// ─────────────────────────────────────────────────────────────────────────

export async function getTeamRewards(params) {
  const response = await apiClient.get('/dashboard/team-rewards/', { params });
  return response.data;
}

export async function updateTeamRewardStatus(id, status) {
  const response = await apiClient.patch(`/dashboard/team-rewards/${id}/`, { status });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// طلبات سحب الأرباح
// ─────────────────────────────────────────────────────────────────────────

export async function getWithdrawals(params) {
  const response = await apiClient.get('/dashboard/withdrawals/', { params });
  return response.data;
}

export async function approveWithdrawal(id) {
  const response = await apiClient.patch(`/dashboard/withdrawals/${id}/approve/`);
  return response.data;
}

export async function rejectWithdrawal(id) {
  const response = await apiClient.patch(`/dashboard/withdrawals/${id}/reject/`);
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// المنتجات (لملء dropdown إضافة سعر لمسوق — قرار A11 #3 في PROGRESS.md)
// ⚠️ المسار الصحيح هو '/products/items/' (ProductListView) وليس '/products/'
//    لإن '/products/' الجذر مُسجَّل لـ CategoryListView في apps/products/urls.py
//    وكان بيرجّع تصنيفات (Categories) بدل المنتجات، فظهر تصنيف واحد بس
//    في الـ dropdown بدل المنتجين الحقيقيين ("2ROOTS TREE" و "LOYALTY 2 ROOTS").
// ─────────────────────────────────────────────────────────────────────────

export async function getAllProducts() {
  const response = await apiClient.get('/products/items/');
  return response.data;
}