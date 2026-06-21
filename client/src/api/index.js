const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

export const api = {
  products: {
    // Публичный магазин показывает только активные товары (activeOnly=1).
    // Этот ответ кэшируется на CDN — каталог меняется редко.
    list: (category) =>
      request(`/products?activeOnly=1${category ? `&category=${category}` : ''}`),
    // Админский список: все товары (вкл. скрытые), без CDN-кэша (нужна свежесть после правок).
    listAll: () => request('/products'),
    get: (id) => request(`/products/${id}`),
  },
  orders: {
    create: (data) =>
      request('/orders', { method: 'POST', body: JSON.stringify(data) }),
    getPublic: (id) => request(`/orders/${id}/public`),
    updateStatus: (id, status, pin) =>
      request(`/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'x-workshop-pin': pin },
        body: JSON.stringify({ status }),
      }),
    list: (pin) =>
      request('/orders', { headers: { 'x-workshop-pin': pin } }),
  },
  payment: {
    initiate: (data) =>
      request('/payment/initiate', { method: 'POST', body: JSON.stringify(data) }),
    getStatus: (orderId) => request(`/payment/status/${orderId}`),
  },
};
