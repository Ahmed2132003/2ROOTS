import api from './api';

/* ─── Me ─────────────────────────────────────────────────────── */
export const getMyMarketerProfile = () =>
  api.get('/marketers/me/').then((r) => r.data);

/* ─── Orders ─────────────────────────────────────────────────── */
export const getMyMarketerOrders = (params = {}) =>
  api.get('/marketers/me/orders/', { params }).then((r) => r.data);

export const createMarketerOrder = (payload) =>
  api.post('/marketers/me/orders/', payload).then((r) => r.data);

/* ─── Product prices assigned to this marketer ───────────────── */
export const getMyProductPrices = () =>
  api.get('/marketers/me/product-prices/').then((r) => r.data);

/* ─── Team Leader Request ─────────────────────────────────────── */
export const getMyTeamLeaderRequest = () =>
  api.get('/marketers/me/team-leader-request/').then((r) => r.data);

export const respondToTeamLeaderRequest = (requestId, accepted) =>
  api
    .post(`/marketers/me/team-leader-request/${requestId}/respond/`, { accepted })
    .then((r) => r.data);

export const getAvailableForTeam = () =>
  api.get('/marketers/available-for-team/').then((r) => r.data);

/**
 * ⚠️ تحديث (دعوات الانضمام للفريق): استبدلت submitTeamForRequest القديمة
 * (كانت بتضم المرشَّحين مباشرة عن طريق /submit-team/ — endpoint اتلغى
 * تمامًا من الباك إند). النظام الجديد دورة دعوة/رد حقيقية:
 *
 *   1. nominateTeamMembers  — القائد يرشّح مسوّقين (يبعتلهم دعوة pending).
 *      يقدر يستخدمها أكتر من مرة على نفس الطلب (مثلاً بعد ما حد يرفض).
 *   2. getMyTeamInvitations — أي مسوّق يشوف الدعوات المعلّقة الجايالوله.
 *   3. respondToTeamInvitation — المسوّق يقبل/يرفض الدعوة اللي وصلته.
 *      الترقية الفعلية للقائد بتتم تلقائيًا في الباك إند لما عدد
 *      الموافقين على نفس الطلب يوصل MARKETER_MIN_TEAM_MEMBERS.
 */

/** POST /api/marketers/me/team-leader-request/{id}/nominate/ */
export const nominateTeamMembers = (requestId, marketerIds) =>
  api
    .post(`/marketers/me/team-leader-request/${requestId}/nominate/`, {
      marketer_ids: marketerIds,
    })
    .then((r) => r.data);

/** GET /api/marketers/me/team-invitations/ — الدعوات المعلّقة الواصلة للمسوق الحالي */
export const getMyTeamInvitations = () =>
  api.get('/marketers/me/team-invitations/').then((r) => r.data);

/** POST /api/marketers/me/team-invitations/{id}/respond/ */
export const respondToTeamInvitation = (invitationId, accepted) =>
  api
    .post(`/marketers/me/team-invitations/${invitationId}/respond/`, { accepted })
    .then((r) => r.data);

/* ─── Withdrawals ────────────────────────────────────────────── */
export const getMyWithdrawals = (params = {}) =>
  api.get('/marketers/me/withdrawals/', { params }).then((r) => r.data);

export const createWithdrawal = (amount) =>
  api.post('/marketers/me/withdrawals/', { amount }).then((r) => r.data);

/* ─── Team Leader ────────────────────────────────────────────── */
export const getMyTeamMembers = () =>
  api.get('/marketers/me/team/').then((r) => r.data);

export const getMyTeamSalesSummary = () =>
  api.get('/marketers/me/team/sales-summary/').then((r) => r.data);

export const getMyRewards = () =>
  api.get('/marketers/me/rewards/').then((r) => r.data);

export const addMembersToTeam = (marketerIds) =>
  api.post('/marketers/me/team/members/', { marketer_ids: marketerIds }).then((r) => r.data);

/* ═══════════════════════════════════════════════════════════════
   Admin — Users Management
   prefix: /api/users/  (مسجّل مرتين في config/urls.py تحت /api/auth/ و /api/users/)
   الـ endpoint الجديد: GET /api/users/list/   (هنضيفه في backend)
                         PATCH /api/users/<id>/role/
                         POST  /api/users/create/
   ═══════════════════════════════════════════════════════════════ */

/** GET /api/users/list/  — قائمة كل اليوزرز (endpoint جديد في backend) */
export const adminGetUsers = (params = {}) =>
  api.get('/users/list/', { params }).then((r) => r.data);

/** PATCH /api/users/<id>/role/  — تعديل role اليوزر */
export const adminUpdateUserRole = (userId, role) =>
  api.patch(`/users/${userId}/role/`, { role }).then((r) => r.data);

/** POST /api/users/create/  — إنشاء يوزر جديد */
export const adminCreateUser = (payload) =>
  api.post('/users/create/', payload).then((r) => r.data);

/* ═══════════════════════════════════════════════════════════════
   Admin — Marketers Management
   prefix: /api/dashboard/  (من apps.marketers.dashboard_urls)
   ═══════════════════════════════════════════════════════════════ */

/** GET /api/dashboard/marketers/  — قائمة كل المسوقين */
export const adminGetMarketers = (params = {}) =>
  api.get('/dashboard/marketers/', { params }).then((r) => r.data);

/** POST /api/dashboard/marketers/  — إضافة مسوق (بـ user_id موجود) */
export const adminCreateMarketer = (payload) =>
  api.post('/dashboard/marketers/', payload).then((r) => r.data);

/** GET /api/dashboard/marketers/<id>/  — تفاصيل مسوق */
export const adminGetMarketer = (id) =>
  api.get(`/dashboard/marketers/${id}/`).then((r) => r.data);

/** PATCH /api/dashboard/marketers/<id>/  — تعديل بيانات مسوق */
export const adminUpdateMarketer = (id, payload) =>
  api.patch(`/dashboard/marketers/${id}/`, payload).then((r) => r.data);

/** DELETE /api/dashboard/marketers/<id>/  — حذف مسوق */
export const adminDeleteMarketer = (id) =>
  api.delete(`/dashboard/marketers/${id}/`).then((r) => r.data);

/* ─── Marketer Product Prices (Admin) ───────────────────────── */

/** GET /api/dashboard/marketers/<marketerId>/product-prices/ */
export const adminGetMarketerPrices = (marketerId) =>
  api.get(`/dashboard/marketers/${marketerId}/product-prices/`).then((r) => r.data);

/** POST /api/dashboard/marketers/<marketerId>/product-prices/ */
export const adminSetMarketerPrice = (marketerId, productId, assignedPrice) =>
  api
    .post(`/dashboard/marketers/${marketerId}/product-prices/`, {
      product: productId,
      assigned_price: assignedPrice,
    })
    .then((r) => r.data);

/** PATCH /api/dashboard/marketer-product-prices/<priceId>/ */
export const adminUpdateMarketerPrice = (marketerId, priceId, assignedPrice) =>
  api
    .patch(`/dashboard/marketer-product-prices/${priceId}/`, {
      assigned_price: assignedPrice,
    })
    .then((r) => r.data);

/** DELETE /api/dashboard/marketer-product-prices/<priceId>/ */
export const adminDeleteMarketerPrice = (marketerId, priceId) =>
  api.delete(`/dashboard/marketer-product-prices/${priceId}/`).then((r) => r.data);

/* ─── Withdrawals (Admin) ────────────────────────────────────── */

/** GET /api/dashboard/withdrawals/ */
export const adminGetWithdrawals = (params = {}) =>
  api.get('/dashboard/withdrawals/', { params }).then((r) => r.data);

/** POST /api/dashboard/withdrawals/<id>/approve/ */
export const adminApproveWithdrawal = (id) =>
  api.post(`/dashboard/withdrawals/${id}/approve/`).then((r) => r.data);

/** POST /api/dashboard/withdrawals/<id>/reject/ */
export const adminRejectWithdrawal = (id) =>
  api.post(`/dashboard/withdrawals/${id}/reject/`).then((r) => r.data);