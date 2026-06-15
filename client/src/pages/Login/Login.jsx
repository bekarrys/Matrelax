import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bed, Loader2, AlertCircle } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authLogin({ email, password });
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-gradient" />
      <div className="login-card glass">
        <div className="login-logo">
          <div className="logo-icon">
            <Bed size={40} strokeWidth={1.5} />
          </div>
          <h1>MATRELAX</h1>
          <p className="login-subtitle">Система управления заказами</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-primary btn-lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                Вход...
              </>
            ) : (
              'Войти'
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
