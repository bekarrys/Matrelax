import { API_URL } from './constants';

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${url}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Не авторизован');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Ошибка сервера');
  }

  return data;
}

export const api = {
  auth: {
    login: ({ email, password }) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    verify: () => request('/auth/verify'),
    users: () => request('/auth/users'),
  },
  products: {
    list: (category) => request(`/products${category ? `?category=${category}` : ''}`),
    get: (id) => request(`/products/${id}`),
    create: (data) => request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/products/${id}`, {
      method: 'DELETE',
    }),
  },
  catalog: {
    get: () => request('/catalog'),
    calculate: (params) => request('/catalog/calculate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  },
  orders: {
    list: () => request('/orders'),
    get: (id) => request(`/orders/${id}`),
    create: (data) => request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/orders/${id}`, {
      method: 'DELETE',
    }),
  },
  employees: {
    list: () => request('/employees'),
    create: (data) => request('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    addAdvance: (id, data) => request(`/employees/${id}/advance`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    addWorklog: (id, data) => request(`/employees/${id}/worklog`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  adminOrders: {
    list: () => request('/admin-orders'),
    get: (id) => request(`/admin-orders/${id}`),
    create: (data) => request('/admin-orders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/admin-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id, status) => request(`/admin-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    unlock: (id, reason) => request(`/admin-orders/${id}/unlock`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
    delete: (id) => request(`/admin-orders/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    // period: 'day' | 'week' | 'month' — только admin
    summary: (period) => request(`/analytics/summary?period=${period}`),
  },
  reports: {
    daily: (date) => request(`/reports/daily${date ? `/${date}` : ''}`),
    monthly: (month) => request(`/reports/monthly${month ? `/${month}` : ''}`),
    debts: () => request('/reports/debts'),
    // period: 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY'  — только admin+manager
    revenue: (period) => request(`/reports/revenue/${period}`),
  },
};
