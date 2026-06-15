import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../StatusBadge/StatusBadge';
import { formatPrice, formatDate, SALES_POINTS } from '../../utils/constants';
import { Phone, MapPin } from 'lucide-react';
import './OrderCard.css';

export default function OrderCard({ order }) {
  const totalItems = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <Link to={`/orders/${order.id}`} className="order-card">
      <div className="order-card-header">
        <span className="order-number">{order.orderNumber}</span>
        <StatusBadge status={order.status} />
      </div>

      <div className="order-card-info">
        <div className="order-card-row">
          <Phone size={14} />
          <span>{order.customerPhone || '—'}</span>
        </div>
        <div className="order-card-row">
          <MapPin size={14} />
          <span>{SALES_POINTS[order.salesPoint] || order.salesPoint}</span>
        </div>
      </div>

      <div className="order-card-items">
        {totalItems > 0 && (
          <span>{totalItems} шт.</span>
        )}
      </div>

      <div className="order-card-footer">
        <span className="order-date">{formatDate(order.createdAt)}</span>
        <span className="order-total">{formatPrice(order.totalAmount)}</span>
      </div>
    </Link>
  );
}
