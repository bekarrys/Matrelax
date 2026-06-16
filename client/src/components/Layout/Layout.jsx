import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bed, ShoppingBag, Users, BarChart3, Settings,
  LogOut, Menu, X, ChevronLeft, ChevronRight, LayoutDashboard, Package, Plus,
} from 'lucide-react';
import './Layout.css';

const ALL_NAV = [
  { path: '/',           icon: Plus,            label: 'Каталог',     roles: ['admin', 'manager'], accent: true },
  { path: '/dashboard',  icon: LayoutDashboard, label: 'Аналитика',   roles: ['admin'] },
  { path: '/orders',     icon: ShoppingBag,     label: 'Все заказы',  roles: ['admin', 'manager'] },
  { path: '/products',   icon: Package,         label: 'Товары',      roles: ['admin'] },
  { path: '/employees',  icon: Users,           label: 'Сотрудники',  roles: ['admin', 'manager'] },
  { path: '/reports',    icon: BarChart3,       label: 'Отчёты',      roles: ['admin', 'manager'] },
  { path: '/settings',   icon: Settings,        label: 'Настройки',   roles: ['admin', 'manager'] },
];

function navActive(path, pathname) {
  if (path === '/') return pathname === '/';
  return pathname.startsWith(path);
}

function userInitials(email = '') {
  return email.slice(0, 2).toUpperCase();
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const navItems = ALL_NAV.filter(item => item.roles.includes(user?.role));

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">

      {/* ── Desktop Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" title="На витрину">
            <Bed size={24} strokeWidth={1.5} />
            {sidebarOpen && <span>MATRELAX</span>}
          </Link>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Свернуть' : 'Развернуть'}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${item.accent ? 'nav-item--accent' : ''} ${navActive(item.path, location.pathname) ? 'active' : ''}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon size={18} />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && user && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">{userInitials(user.email)}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-email">{user.email}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
            </div>
          )}
          <button className="nav-item logout-btn" onClick={handleLogout} title={!sidebarOpen ? 'Выйти' : undefined}>
            <LogOut size={18} />
            {sidebarOpen && <span>Выйти</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="mobile-header">
        <button className="menu-btn" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={22} />
        </button>
        <Link to="/" className="mobile-logo" title="На витрину">
          <Bed size={22} strokeWidth={1.5} />
          <span>MATRELAX</span>
        </Link>
        <div className="mobile-user" onClick={handleLogout}>
          <LogOut size={20} />
        </div>
      </header>

      {/* ── Mobile Menu ── */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}>
          <nav className="mobile-menu" onClick={e => e.stopPropagation()}>
            <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>
              <X size={22} />
            </button>
            <div className="mobile-menu-user">
              <Bed size={28} strokeWidth={1.5} />
              <div>
                <strong>MATRELAX</strong>
                <small>{user?.email}</small>
              </div>
            </div>
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-item ${item.accent ? 'nav-item--accent' : ''} ${navActive(item.path, location.pathname) ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <button className="mobile-nav-item logout-mobile" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
              <LogOut size={18} />
              Выйти
            </button>
          </nav>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}
