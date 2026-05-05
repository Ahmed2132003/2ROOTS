import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

function normalizeCustomer(customer) {
  return {
    ...customer,
    fullName: customer.name || customer.username || customer.email?.split('@')[0] || 'Unknown',    
    createdAt: customer.created_at,
    totalOrders: Number(customer.total_orders || 0),
    totalSpent: Number(customer.total_spent || 0),
    lastOrderDate: customer.last_order_date || null,
  };
}

function normalizeOrder(order) {
  return {
    ...order,
    createdAt: order.created_at,
    totalPrice: Number(order.total || 0),
  };
}

async function fetchCustomers(params) {
  const response = await api.get('/auth/customers/', {    
    params: {
      search: params.search || undefined,
      page: params.page,
      page_size: params.pageSize,
    },
  });

  const payload = response.data;
  const items = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : []);

  return {
    items: items.map(normalizeCustomer),
    total: payload?.count ?? items.length,
  };
}

async function fetchCustomer(customerId) {
  const response = await api.get(`/auth/customers/${customerId}/`);  
  const payload = response.data || {};
  const customer = normalizeCustomer(payload.customer || {});
  const orders = (Array.isArray(payload.orders) ? payload.orders : []).map(normalizeOrder);

  return {
    customer,
    totalOrders: Number(payload.total_orders ?? orders.length),
    totalSpent: Number(payload.total_spent ?? 0),
    lastOrderDate: orders[0]?.created_at || null,
    orders,
  };
}

export function useCustomers(params) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => fetchCustomers(params),
    placeholderData: (previous) => previous,
  });
}

export function useCustomer(customerId) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => fetchCustomer(customerId),
    enabled: Boolean(customerId),
  });
}