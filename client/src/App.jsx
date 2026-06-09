import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Публичный магазин
import Home from './pages/Home/Home';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Checkout from './pages/Checkout/Checkout';
import OrderStatus from './pages/OrderStatus/OrderStatus';
import CartSheet from './components/CartSheet/CartSheet';

// Авторизация
import Login from './pages/Login/Login';

// Панель персонала (admin + manager)
import Layout from './components/Layout/Layout';
import Orders from './pages/Orders/Orders';
import CreateOrder from './pages/CreateOrder/CreateOrder';
import OrderDetails from './pages/OrderDetails/OrderDetails';
import Employees from './pages/Employees/Employees';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';

// Только для Администратора
import AdminRoute from './components/AdminRoute/AdminRoute';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import ProductEditor from './pages/ProductEditor/ProductEditor';
import ProductList from './pages/ProductList/ProductList';

// Экран исполнителя
import Executor from './pages/Executor/Executor';

function LoadingScreen() {
  return <div className="loading-screen">Загрузка...</div>;
}

// Только для авторизованных (любая роль)
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Admin + Manager → Layout с сайдбаром
function StaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'executor') return <Navigate to="/executor" replace />;
  return <Layout>{children}</Layout>;
}

// Только executor
function ExecutorRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'executor') return <Navigate to="/orders" replace />;
  return children;
}

// Страница логина — перенаправляет если уже вошёл
function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    return user.role === 'executor'
      ? <Navigate to="/executor" replace />
      : <Navigate to="/orders" replace />;
  }
  return <Login />;
}

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

      {/* ── Авторизация ── */}
      <Route path="/login" element={<LoginRoute />} />

      {/* ── Исполнитель (цех) ── */}
      <Route path="/executor" element={
        <ExecutorRoute><Executor /></ExecutorRoute>
      } />

      {/* ── Панель персонала (admin + manager) ── */}
      <Route path="/orders"      element={<StaffRoute><Orders /></StaffRoute>} />
      <Route path="/orders/new"  element={<StaffRoute><CreateOrder /></StaffRoute>} />
      <Route path="/orders/:id"  element={<StaffRoute><OrderDetails /></StaffRoute>} />
      <Route path="/employees"   element={<StaffRoute><Employees /></StaffRoute>} />
      <Route path="/reports"     element={<StaffRoute><Reports /></StaffRoute>} />
      <Route path="/settings"    element={<StaffRoute><Settings /></StaffRoute>} />

      {/* ── Только Администратор ── */}
      <Route path="/dashboard" element={
        <AdminRoute><AdminDashboard /></AdminRoute>
      } />
      <Route path="/products" element={
        <StaffRoute><AdminRoute><ProductList /></AdminRoute></StaffRoute>
      } />
      <Route path="/products/edit/:id" element={
        <StaffRoute><AdminRoute><ProductEditor /></AdminRoute></StaffRoute>
      } />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
