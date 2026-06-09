import { useAuth } from '../../context/AuthContext';

/**
 * RoleGuard — рендерит children только если роль текущего пользователя
 * входит в список разрешённых. Иначе показывает fallback (по умолчанию ничего).
 *
 * ВАЖНО: это защита уровня UX (скрыть кнопку), а НЕ безопасность.
 * Реальную проверку прав всегда дублируй на бэкенде (requireRole в middleware),
 * иначе действие можно выполнить запросом к API в обход интерфейса.
 *
 * @example
 *   <RoleGuard roles={['admin']}>
 *     <button onClick={deleteEmployee}>Удалить</button>
 *   </RoleGuard>
 */
export function RoleGuard({ roles, children, fallback = null }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return fallback;
  }

  return children;
}

export default RoleGuard;
