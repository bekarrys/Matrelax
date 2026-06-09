import React, { useEffect } from 'react';
import './BottomSheet.css';

export default function BottomSheet({ isOpen, onClose, title, children, noOverlay }) {
  useEffect(() => {
    if (noOverlay) return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, noOverlay]);

  if (!isOpen) return null;

  if (noOverlay) {
    return (
      <div
        className="bs-sheet bs-sheet--page"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bs-handle" />
        {title && <div className="bs-title">{title}</div>}
        <div className="bs-content">{children}</div>
      </div>
    );
  }

  return (
    <div className="bs-overlay" onClick={onClose}>
      <div
        className="bs-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bs-handle" />
        {title && <div className="bs-title">{title}</div>}
        <div className="bs-content">{children}</div>
      </div>
    </div>
  );
}
