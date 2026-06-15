import React from 'react';
import { formatPrice, formatDate, SALES_POINTS, DELIVERY_TYPES } from '../../utils/constants';
import { X, Copy, Share2 } from 'lucide-react';
import './Receipt.css';

export default function Receipt({ order, onClose }) {
  const items = order.items || [];
  const mattressesTotal = items.reduce((sum, item) => sum + ((item.price + item.surcharge) * item.quantity), 0);

  const handleCopy = () => {
    const text = generateReceiptText(order);
    navigator.clipboard.writeText(text).then(() => {
      alert('Квитанция скопирована!');
    });
  };

  const handleShare = () => {
    const text = generateReceiptText(order);
    const url = `https://wa.me/${order.customerPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-card" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-header">
          <div className="receipt-logo">
            <h2>🛏️ MATRELAX</h2>
            <p>Производство матрасов</p>
          </div>
          <button className="receipt-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-info">
          <div className="receipt-row">
            <span>Заказ №:</span>
            <span className="receipt-value">{order.orderNumber}</span>
          </div>
          <div className="receipt-row">
            <span>Дата:</span>
            <span className="receipt-value">{formatDate(order.createdAt)}</span>
          </div>
          <div className="receipt-row">
            <span>Точка:</span>
            <span className="receipt-value">{SALES_POINTS[order.salesPoint]}</span>
          </div>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-items">
          <h4>ПОЗИЦИИ:</h4>
          {items.filter(i => i.modelId).map((item, idx) => {
            const catalog = window.catalogCache;
            const modelName = catalog?.models[item.modelId]?.name || item.modelId;
            const unitPrice = item.price + item.surcharge;
            const lineTotal = unitPrice * item.quantity;
            return (
              <div key={idx} className="receipt-item">
                <div className="receipt-item-name">{modelName}</div>
                <div className="receipt-item-size">{item.size}{catalog?.sizeDisplay}{item.extra10cm ? ' +10см' : ''} × {item.quantity} шт.</div>
                <div className="receipt-item-price">{formatPrice(unitPrice)} × {item.quantity} = {formatPrice(lineTotal)}</div>
              </div>
            );
          })}
        </div>

        <div className="receipt-divider" />

        <div className="receipt-totals">
          <div className="receipt-totals-row">
            <span>Доставка:</span>
            <span>{formatPrice(order.deliveryFee || 0)}</span>
          </div>
          {order.discount > 0 && (
            <div className="receipt-totals-row negative">
              <span>Скидка:</span>
              <span>−{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="receipt-totals-row grand">
            <span>ИТОГО:</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="receipt-totals-row">
            <span>Оплачено:</span>
            <span>{formatPrice(order.paidAmount || 0)}</span>
          </div>
          <div className={`receipt-totals-row ${order.balance > 0 ? 'debt' : ''}`}>
            <span>{order.balance > 0 ? 'Долг:' : 'Сдача:'}</span>
            <span>{formatPrice(Math.abs(order.balance || 0))}</span>
          </div>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-footer-info">
          <div className="receipt-row">
            <span>Получение:</span>
            <span className="receipt-value">{DELIVERY_TYPES[order.deliveryType]}</span>
          </div>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-bottom">
          <p>Гарантия: согласно спецификации модели</p>
          <p className="receipt-thanks">Спасибо за покупку! ❤️</p>
          <p className="receipt-brand">MATRELAX — Сделано в Казахстане 🇰🇿</p>
        </div>

        <div className="receipt-actions">
          <button className="btn-action" onClick={handleShare}>
            <Share2 size={16} />
            WhatsApp
          </button>
          <button className="btn-action" onClick={handleCopy}>
            <Copy size={16} />
            Копировать
          </button>
          <button className="btn-action" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

function generateReceiptText(order) {
  const items = order.items || [];
  let text = `🛏️ MATRELAX\nПроизводство матрасов\n\n`;
  text += `Заказ №: ${order.orderNumber}\n`;
  text += `Дата: ${formatDate(order.createdAt)}\n\n`;
  text += `ПОЗИЦИИ:\n`;
  items.filter(i => i.modelId).forEach(item => {
    const unitPrice = item.price + item.surcharge;
    const lineTotal = unitPrice * item.quantity;
    text += `${item.modelId} ${item.size}×200 × ${item.quantity} шт. = ${formatPrice(lineTotal)}\n`;
  });
  text += `\nДоставка: ${formatPrice(order.deliveryFee || 0)}\n`;
  if (order.discount > 0) text += `Скидка: -${formatPrice(order.discount)}\n`;
  text += `\nИТОГО: ${formatPrice(order.totalAmount)}\n`;
  text += `Оплачено: ${formatPrice(order.paidAmount || 0)}\n`;
  text += `Долг: ${formatPrice(Math.abs(order.balance || 0))}\n\n`;
  text += `MATRELAX — Сделано в Казахстане 🇰🇿`;
  return text;
}
