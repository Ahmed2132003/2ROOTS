import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function normalizeOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.price_at_order || 0) * Number(item.quantity || 0), 0);
  return {
    ...order,
    customerName: order.shipping_name || 'Unknown customer',
    totalPrice: Number(order.total || 0),
    subtotal,
    shipping: Number(order.shipping || 0),
    tax: Number(order.tax || 0),
    discount: Number(order.discount || 0),
    createdAt: order.created_at,
    products: items.map((item) => ({
      id: item.id,
      name: item.product_name,
      quantity: item.quantity,
      price: Number(item.price_at_order || 0),
      image: item.image || item.product_image || item.image_url || '',
    })),
  };
}

async function fetchOrders(params) {
  const response = await api.get('/orders/admin/', { params: { search: params.search || undefined, status: params.status !== 'all' ? params.status : undefined, sortBy: params.sortBy, date_from: params.dateFrom || undefined, date_to: params.dateTo || undefined, page: params.page, page_size: params.pageSize } });
  const payload = response.data;
  const items = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : []);
  return { items: items.map(normalizeOrder), total: payload?.count ?? items.length };
}

async function fetchOrderById(orderId) {
  const response = await api.get(`/orders/admin/${orderId}/`);
  return normalizeOrder(response.data);
}

async function fetchMyOrders() {
  const response = await api.get('/orders/my-orders/');
  const payload = response.data;
  const items = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : []);
  return items.map(normalizeOrder);
}

export function useOrders(params) { return useQuery({ queryKey: ['orders', params], queryFn: () => fetchOrders(params), placeholderData: (p) => p }); }
export function useOrder(orderId) { return useQuery({ queryKey: ['order', orderId], queryFn: () => fetchOrderById(orderId), enabled: Boolean(orderId) }); }
export function useMyOrders() { return useQuery({ queryKey: ['my-orders'], queryFn: fetchMyOrders }); }

export function useCreateOrder() { const qc = useQueryClient(); return useMutation({ mutationFn: (data) => api.post('/orders/admin/', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) }); }
export function useDeleteOrder() { const qc = useQueryClient(); return useMutation({ mutationFn: (id) => api.delete(`/orders/admin/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) }); }
export function useUpdateOrderStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ orderId, status, note }) => api.patch(`/orders/admin/${orderId}/status/`, { status, note: note || '' }), onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['order', v.orderId] }); } }); }

export { ORDER_STATUSES };