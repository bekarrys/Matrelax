import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Витрина (рабочее место менеджера, под логином)
import Home from './pages/Home/Home';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Checkout from './pages/Checkout/Checkout';
import CartSheet from './components/CartSheet/CartSheet';

// Авторизация
import Login from './pages/Login/Login';

// Управление заказами (таблица + карточка) в Layout
import Layout from './components/Layout/Layout';
import Orders from './pages/Orders/Orders';
import OrderDetails from './pages/OrderDetails/OrderDetails';
import Employees from './pages/Employees/Employees';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';

// Только для администратора
import AdminRoute from './components/AdminRoute/AdminRoute';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import ProductEditor from './pages/ProductEditor/ProductEditor';
import ProductList from './pages/ProductList/ProductList';

// Экран исполнителя
import Executor from './pages/Executor/Executor';

function LoadingScreen() {
  return <div className="loading-screen">Загрузка...</div>;
}

// Доступ к витрине — только admin/manager. Без сайдбара (витрина со своей шапкой).
function ManagerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'executor') return <Navigate to="/executor" replace />;
  if (user.role !== 'admin' && user.role !== 'manager') return <Navigate to="/login" replace />;
  return children;
}

// Управление заказами — admin/manager в Layout (сайдбар).
function StaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'executor') return <Navigate to="/executor" replace />;
  if (user.role !== 'admin' && user.role !== 'manager') return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function ExecutorRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'executor') return <Navigate to="/" replace />;
  return children;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    return user.role === 'executor' ? <Navigate to="/executor" replace /> : <Navigate to="/" replace />;
  }
  return <Login />;
}

export default function App() {
  return (
    <>
      <CartSheet />
      <Routes>
        {/* Витрина (под логином) */}
        <Route path="/" element={<ManagerRoute><Home /></ManagerRoute>} />
        <Route path="/product/:id" element={<ManagerRoute><ProductDetail /></ManagerRoute>} />
        <Route path="/checkout" element={<ManagerRoute><Checkout /></ManagerRoute>} />

        {/* Авторизация */}
        <Route path="/login" element={<LoginRoute />} />

        {/* Исполнитель */}
        <Route path="/executor" element={<ExecutorRoute><Executor /></ExecutorRoute>} />

        {/* Управление заказами */}
        <Route path="/orders" element={<StaffRoute><Orders /></StaffRoute>} />
        <Route path="/orders/:id" element={<StaffRoute><OrderDetails /></StaffRoute>} />
        <Route path="/employees" element={<StaffRoute><Employees /></StaffRoute>} />
        <Route path="/reports" element={<StaffRoute><Reports /></StaffRoute>} />
        <Route path="/settings" element={<StaffRoute><Settings /></StaffRoute>} />

        {/* Только администратор */}
        <Route path="/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/products" element={<StaffRoute><AdminRoute><ProductList /></AdminRoute></StaffRoute>} />
        <Route path="/products/edit/:id" element={<StaffRoute><AdminRoute><ProductEditor /></AdminRoute></StaffRoute>} />

        {/* Любой другой путь → корень (витрина/логин) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
