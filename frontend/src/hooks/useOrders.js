import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const MOCK_ORDERS = [
  {
    id: 'ORD-1001',
    customerName: 'Sarah Johnson',
    customer: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1 (555) 101-2020',
      address: '22 Market St, San Francisco, CA 94103',
    },
    paymentMethod: 'Credit Card',
    status: 'processing',
    createdAt: '2026-04-25T08:40:00Z',
    subtotal: 220,
    shipping: 15,
    tax: 18,
    discount: 10,
    products: [
      { id: 1, name: 'Shark Wireless Headphones', image: 'https://picsum.photos/seed/headphones/120/120', quantity: 1, price: 120 },
      { id: 2, name: 'Shark Smartwatch Pro', image: 'https://picsum.photos/seed/watch/120/120', quantity: 1, price: 100 },
    ],
  },
  {
    id: 'ORD-1002',
    customerName: 'Michael Carter',
    customer: {
      name: 'Michael Carter',
      email: 'michael.carter@example.com',
      phone: '+1 (555) 203-8872',
      address: '18 Fulton Ave, New York, NY 10013',
    },
    paymentMethod: 'PayPal',
    status: 'pending',
    createdAt: '2026-04-26T13:12:00Z',
    subtotal: 80,
    shipping: 5,
    tax: 6.2,
    discount: 0,
    products: [
      { id: 3, name: 'Shark USB-C Cable', image: 'https://picsum.photos/seed/cable/120/120', quantity: 4, price: 20 },
    ],
  },
  {
    id: 'ORD-1003',
    customerName: 'Olivia Brown',
    customer: {
      name: 'Olivia Brown',
      email: 'olivia.brown@example.com',
      phone: '+1 (555) 900-4561',
      address: '404 Sunset Blvd, Los Angeles, CA 90028',
    },
    paymentMethod: 'Cash on Delivery',
    status: 'shipped',
    createdAt: '2026-04-21T09:01:00Z',
    subtotal: 340,
    shipping: 18,
    tax: 27.2,
    discount: 0,
    products: [
      { id: 4, name: 'Shark 4K Action Camera', image: 'https://picsum.photos/seed/camera/120/120', quantity: 2, price: 170 },
    ],
  },
  {
    id: 'ORD-1004',
    customerName: 'Liam Evans',
    customer: {
      name: 'Liam Evans',
      email: 'liam.evans@example.com',
      phone: '+1 (555) 775-1414',
      address: '88 River Rd, Austin, TX 78701',
    },
    paymentMethod: 'Apple Pay',
    status: 'delivered',
    createdAt: '2026-04-16T16:35:00Z',
    subtotal: 150,
    shipping: 8,
    tax: 12,
    discount: 5,
    products: [
      { id: 5, name: 'Shark Portable Speaker', image: 'https://picsum.photos/seed/speaker/120/120', quantity: 1, price: 150 },
    ],
  },
  {
    id: 'ORD-1005',
    customerName: 'Noah Wilson',
    customer: {
      name: 'Noah Wilson',
      email: 'noah.wilson@example.com',
      phone: '+1 (555) 661-0902',
      address: '12 Pine St, Seattle, WA 98101',
    },
    paymentMethod: 'Credit Card',
    status: 'cancelled',
    createdAt: '2026-04-20T11:50:00Z',
    subtotal: 95,
    shipping: 0,
    tax: 7.6,
    discount: 0,
    products: [
      { id: 6, name: 'Shark Gaming Mouse', image: 'https://picsum.photos/seed/mouse/120/120', quantity: 1, price: 95 },
    ],
  },
];

const mockOrdersDb = [...MOCK_ORDERS];

function normalizeOrder(order) {
  const products = order.products || [];
  const subtotal = Number(order.subtotal ?? products.reduce((sum, product) => sum + Number(product.price) * Number(product.quantity), 0));
  const shipping = Number(order.shipping ?? 0);
  const tax = Number(order.tax ?? 0);
  const discount = Number(order.discount ?? 0);

  return {
    ...order,
    customerName: order.customerName || order.customer?.name || 'Unknown customer',
    totalPrice: Number(order.totalPrice ?? subtotal + shipping + tax - discount),
    subtotal,
    shipping,
    tax,
    discount,
  };
}

function sortOrders(orders, sortBy) {
  const sorted = [...orders];

  if (sortBy === 'priceAsc') {
    return sorted.sort((a, b) => a.totalPrice - b.totalPrice);
  }

  if (sortBy === 'priceDesc') {
    return sorted.sort((a, b) => b.totalPrice - a.totalPrice);
  }

  if (sortBy === 'dateAsc') {
    return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function applyListFilters(orders, params) {
  const term = (params.search || '').trim().toLowerCase();
  const status = params.status || 'all';

  const filtered = orders.filter((order) => {
    const matchesSearch =
      !term ||
      order.id.toLowerCase().includes(term) ||
      order.customerName.toLowerCase().includes(term);
    const matchesStatus = status === 'all' || order.status === status;

    return matchesSearch && matchesStatus;
  });

  return sortOrders(filtered, params.sortBy || 'dateDesc');
}

async function fetchOrders(params) {
  try {
    const response = await api.get('/orders', {
      params: {
        search: params.search || undefined,
        status: params.status !== 'all' ? params.status : undefined,
        page: params.page,
        pageSize: params.pageSize,
        sortBy: params.sortBy,
      },
    });

    const payload = response?.data;
    const items = Array.isArray(payload) ? payload : payload?.results;

    if (!Array.isArray(items)) {
      throw new Error('Unexpected orders response shape.');
    }

    return {
      items: items.map(normalizeOrder),
      total: Number(payload?.total ?? payload?.count ?? items.length),
    };
  } catch {
    const filtered = applyListFilters(mockOrdersDb.map(normalizeOrder), params);
    const start = (params.page - 1) * params.pageSize;
    const end = start + params.pageSize;

    return {
      items: filtered.slice(start, end),
      total: filtered.length,
    };
  }
}

async function fetchOrderById(orderId) {
  try {
    const response = await api.get(`/orders/${orderId}`);
    return normalizeOrder(response.data);
  } catch {
    const localOrder = mockOrdersDb.find((order) => String(order.id) === String(orderId));

    if (!localOrder) {
      throw new Error('Order not found.');
    }

    return normalizeOrder(localOrder);
  }
}

async function patchOrderStatus({ orderId, status }) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error('Invalid status selected.');
  }

  try {
    const response = await api.patch(`/orders/${orderId}/status`, { status });
    return normalizeOrder(response.data);
  } catch {
    const orderIndex = mockOrdersDb.findIndex((order) => String(order.id) === String(orderId));

    if (orderIndex === -1) {
      throw new Error('Order not found.');
    }

    mockOrdersDb[orderIndex] = { ...mockOrdersDb[orderIndex], status };
    return normalizeOrder(mockOrdersDb[orderIndex]);
  }
}

export function useOrders(params) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => fetchOrders(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useOrder(orderId) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrderById(orderId),
    enabled: Boolean(orderId),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchOrderStatus,
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      await queryClient.cancelQueries({ queryKey: ['order', orderId] });

      const previousOrders = queryClient.getQueriesData({ queryKey: ['orders'] });
      const previousOrder = queryClient.getQueryData(['order', orderId]);

      previousOrders.forEach(([key, snapshot]) => {
        if (!snapshot?.items) {
          return;
        }

        queryClient.setQueryData(key, {
          ...snapshot,
          items: snapshot.items.map((order) =>
            String(order.id) === String(orderId) ? { ...order, status } : order,
          ),
        });
      });

      if (previousOrder) {
        queryClient.setQueryData(['order', orderId], { ...previousOrder, status });
      }

      return { previousOrders, previousOrder, orderId };
    },
    onError: (_error, _variables, context) => {
      context?.previousOrders?.forEach(([key, snapshot]) => {
        queryClient.setQueryData(key, snapshot);
      });

      if (context?.previousOrder) {
        queryClient.setQueryData(['order', context.orderId], context.previousOrder);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
    },
  });
}

export { ORDER_STATUSES };