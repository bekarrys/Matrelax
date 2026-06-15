import React from 'react';
import { STATUS_LABELS, STATUS_COLORS, STATUS_BG } from '../../utils/constants';
import './StatusBadge.css';

export default function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const color = STATUS_COLORS[status] || 'var(--text-secondary)';
  const bg = STATUS_BG[status] || 'var(--bg-card)';

  return (
    <span className="status-badge" style={{ color, background: bg }}>
      <span className="status-dot" style={{ background: color }} />
      {label}
    </span>
  );
}
