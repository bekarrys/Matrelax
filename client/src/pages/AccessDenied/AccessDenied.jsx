import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  manager:  'Менеджер',
  executor: 'Исполнитель',
  client:   'Клиент',
};

export default function AccessDenied({ userRole }) {
  const navigate  = useNavigate();
  const { logout } = useAuth();
  const roleLabel = ROLE_LABELS[userRole] ?? userRole ?? 'Неизвестная роль';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

        {/* Красная полоса сверху */}
        <div className="h-1.5 bg-gradient-to-r from-rose-500 to-rose-600" />

        <div className="p-8 flex flex-col items-center text-center gap-6">

          {/* Иконка */}
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-100">
            <ShieldOff className="w-10 h-10 text-rose-500" strokeWidth={1.5} />
          </div>

          {/* Заголовок */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Доступ запрещён
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Эта страница доступна только пользователям с ролью{' '}
              <span className="font-semibold text-gray-700">Администратор</span>.
            </p>
          </div>

          {/* Бейдж текущей роли */}
          {userRole && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
              <span className="text-xs text-amber-700 font-medium">Ваша роль:</span>
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                {roleLabel}
              </span>
            </div>
          )}

          {/* Разделитель */}
          <div className="w-full border-t border-gray-100" />

          {/* Кнопки */}
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl
                         bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                         text-white font-medium text-sm transition-colors duration-150"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться назад
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl
                         bg-white hover:bg-gray-50 active:bg-gray-100
                         text-gray-600 font-medium text-sm
                         border border-gray-200 transition-colors duration-150"
            >
              <LogIn className="w-4 h-4" />
              Войти под другим аккаунтом
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
