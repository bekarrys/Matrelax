export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const STATUS = {
  PROGRESS: 'progress',
  READY: 'ready',
  DELIVERY: 'delivery',
  DELIVERED: 'delivered',
};

export const STATUS_LABELS = {
  [STATUS.PROGRESS]: 'В работе',
  [STATUS.READY]: 'Готов',
  [STATUS.DELIVERY]: 'Доставка',
  [STATUS.DELIVERED]: 'Доставлен',
};

export const STATUS_COLORS = {
  [STATUS.PROGRESS]: 'var(--status-progress)',
  [STATUS.READY]: 'var(--status-ready)',
  [STATUS.DELIVERY]: 'var(--status-delivery)',
  [STATUS.DELIVERED]: 'var(--status-delivered)',
};

export const STATUS_BG = {
  [STATUS.PROGRESS]: 'var(--status-progress-bg)',
  [STATUS.READY]: 'var(--status-ready-bg)',
  [STATUS.DELIVERY]: 'var(--status-delivery-bg)',
  [STATUS.DELIVERED]: 'var(--status-delivered-bg)',
};

export const SALES_POINTS = {
  armada: 'Армада',
  madeniyet: 'Маденият',
};

export const ORDER_TYPES = {
  sale: 'Продажа',
  supply: 'Поставка',
};

export const CLIENT_CATEGORIES = {
  regular: 'Обычный',
};

export const PAYMENT_TYPES = {
  paid: 'Оплачен',
  debt: 'Долг',
  advance: 'Аванс',
};

export const DELIVERY_TYPES = {
  delivery: '🚚 Доставка',
  pickup: '🏠 Самовывоз',
};

export function formatPrice(amount) {
  if (amount == null) return '0 KZT';
  return new Intl.NumberFormat('ru-KZ').format(amount) + ' KZT';
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPhone(value) {
  const raw = value.replace(/\D/g, '');
  if (raw.length === 0) return '';
  const digits = raw.startsWith('8') ? '7' + raw.slice(1) : raw;
  if (!digits.startsWith('7')) return '+7';
  let result = '+7';
  if (digits.length > 1) result += ' ' + digits.slice(1, 4);
  if (digits.length > 4) result += ' ' + digits.slice(4, 7);
  if (digits.length > 7) result += ' ' + digits.slice(7, 9);
  if (digits.length > 9) result += ' ' + digits.slice(9, 11);
  return result;
}
