import { API_URL } from './constants';

// ID-токен Firebase живёт 1 час. Меняем протухший на свежий через refreshToken,
// не выкидывая пользователя. Общий промис — параллельные 401 рефрешат один раз.
let refreshing = null;
function refreshSession() {
  if (refreshing) return refreshing;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return Promise.resolve(null);
  refreshing = fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d) return null;
      localStorage.setItem('token', d.token);
      localStorage.setItem('refreshToken', d.refreshToken);
      return d.token;
    })
    .catch(() => null)
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function request(url, options = {}, retried = false) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${url}`, { ...options, headers });

  if (res.status === 401) {
    // Первый 401 — пробуем обновить сессию и повторить запрос один раз.
    if (!retried) {
      const newToken = await refreshSession();
      if (newToken) return request(url, options, true);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
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
    // Админский список: все товары (вкл. скрытые), без CDN-кэша.
    listAll: () => request('/products'),
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
    // period: 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY'  — только admin+manager
    revenue: (period) => request(`/reports/revenue/${period}`),
  },
};
