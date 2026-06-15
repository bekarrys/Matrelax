import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Клиентское приложение — только магазин для покупателя.
// Менеджерский портал выведен из эксплуатации (декомиссия): его страницы
// (Orders, OrderDetails, AdminDashboard, …) и серверный API остаются в
// репозитории, но НЕ подключены к этой клиентской сборке.
import Home from './pages/Home/Home';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Checkout from './pages/Checkout/Checkout';
import OrderStatus from './pages/OrderStatus/OrderStatus';
import CartSheet from './components/CartSheet/CartSheet';

export default function App() {
  return (
    <>
      <CartSheet />
      <Routes>
        {/* ── Публичный магазин ── */}
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Navigate to="/" replace />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:id" element={<OrderStatus />} />

        {/* Любой другой путь (в т.ч. старые пути панели) → магазин */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
