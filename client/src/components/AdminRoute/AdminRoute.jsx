import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccessDenied from '../../pages/AccessDenied/AccessDenied';

/**
 * AdminRoute — обёртка для маршрутов, доступных ТОЛЬКО роли 'admin'.
 *
 * Логика:
 *   • Нет пользователя       → /login
 *   • role !== 'admin'       → <AccessDenied />  (менеджер видит причину, а не 404)
 *   • role === 'admin'       → рендерит children
 *
 * Роль читается из user.role (декодируется сервером из Firebase custom claim
 * token.role при верификации токена — см. server/middleware/auth.js).
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Проверка прав доступа...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <AccessDenied userRole={user.role} />;

  return children;
}
