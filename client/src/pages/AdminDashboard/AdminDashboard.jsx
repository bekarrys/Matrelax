import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, CreditCard,
  Calendar, CalendarDays, Loader2, Eye,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { api } from '../../utils/api';
import { formatPrice, formatDate } from '../../utils/constants';
import './AdminDashboard.css';
import './AdminDashboard.css';

const STATUS_BADGE = {
  progress:  { label: 'В работе',  cls: 'badge-progress'  },
  ready:     { label: 'Готов',     cls: 'badge-ready'     },
  delivery:  { label: 'Доставка',  cls: 'badge-delivery'  },
  delivered: { label: 'Доставлен', cls: 'badge-delivered' },
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="chart-tooltip-value" style={{ color: p.color }}>
          {formatPrice(p.value)}
        </p>
      ))}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className={`kpi-card kpi-${color}`}>
      <div className="kpi-top">
        <div className="kpi-icon"><Icon size={18} strokeWidth={2} /></div>
        {trend != null && (
          <div className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod]               = useState('day');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary,       setSummary]       = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);

  // График (по дням месяца) + список последних заказов
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [monthly, ordersData] = await Promise.all([
          api.reports.monthly(selectedMonth),
          api.adminOrders.list(),
        ]);
        setMonthlyReport(monthly);
        setOrders(ordersData.orders ?? []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedMonth]);

  // KPI: единый admin-only эндпоинт аналитики (День | Неделя | Месяц)
  useEffect(() => {
    api.analytics.summary(period)
      .then(setSummary)
      .catch((err) => { console.error('Analytics error:', err); setSummary(null); });
  }, [period]);

  const revenue    = summary?.revenue ?? 0;
  const orderCount = summary?.orderCount ?? 0;
  const avgCheck   = summary?.avgCheck ?? 0;
  const inProgress = orders.filter(o => o.status === 'progress').length;
  const periodLabel = period === 'day' ? 'сегодня' : period === 'week' ? 'за неделю' : 'за месяц';

  const chartData = useMemo(() => {
    if (!monthlyReport?.orders?.length) return [];
    const byDay = {};
    monthlyReport.orders.forEach(order => {
      const day = order.createdAt?.slice(0, 10);
      if (!day) return;
      byDay[day] = (byDay[day] || 0) + (order.totalAmount || 0);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rev]) => ({ date: date.slice(8), revenue: rev, label: formatDate(date) }));
  }, [monthlyReport]);

  const recentOrders = orders.slice(0, 10);

  if (loading) {
    return (
      <div className="dash-loading">
        <Loader2 size={32} className="spin" />
        <p>Загрузка дашборда...</p>
      </div>
    );
  }

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Аналитика</h1>
          <p className="dash-subtitle">Только для администратора</p>
        </div>

        <div className="dash-controls">
          <div className="period-toggle">
            <button className={`period-btn ${period === 'day' ? 'active' : ''}`} onClick={() => setPeriod('day')}>
              День
            </button>
            <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>
              Неделя
            </button>
            <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>
              Месяц
            </button>
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="dash-date-input"
            title="Месяц для графика"
          />
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid">
        <KpiCard icon={TrendingUp}  label={`Выручка ${periodLabel}`} value={formatPrice(revenue)} sub={`${orderCount} заказов`} color="blue" />
        <KpiCard icon={ShoppingBag} label="Заказов в работе" value={inProgress} sub="в производстве" color="amber" />
        <KpiCard icon={CreditCard}  label="Средний чек" value={avgCheck > 0 ? formatPrice(avgCheck) : '—'} sub={orderCount > 0 ? `по ${orderCount} заказам` : 'нет данных'} color="green" />
      </div>

      {/* ── Chart ── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Динамика продаж</h2>
            <p className="dash-card-sub">Выручка по дням за {selectedMonth}</p>
          </div>
        </div>
        <div className="dash-card-body">
          {chartData.length === 0 ? (
            <div className="dash-empty">
              <TrendingUp size={36} className="dash-empty-icon" />
              <p>Нет данных за выбранный период</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#555' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#555' }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={() => 'Выручка (₸)'} wrapperStyle={{ fontSize: 11, color: '#666' }} />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#2563eb', stroke: '#0a0a0a', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Transactions ── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Последние транзакции</h2>
            <p className="dash-card-sub">{recentOrders.length} последних заказов</p>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="dash-empty" style={{ padding: '48px 24px' }}>
            <ShoppingBag size={36} className="dash-empty-icon" />
            <p>Заказов пока нет</p>
          </div>
        ) : (
          <>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Заказ</th>
                    <th>Клиент</th>
                    <th>Статус</th>
                    <th className="text-right">Сумма</th>
                    <th className="text-right">Оплачено</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => {
                    const badge  = STATUS_BADGE[order.status] ?? { label: order.status, cls: '' };
                    const unpaid = (order.totalAmount ?? 0) - (order.paidAmount ?? 0);
                    return (
                      <tr key={order.id} className="dash-tr" onClick={() => navigate(`/orders/${order.id}`)}>
                        <td>
                          <p className="dash-order-num">{order.orderNumber}</p>
                          <p className="dash-order-date">{formatDate(order.createdAt)}</p>
                        </td>
                        <td className="dash-phone">+{order.customerPhone}</td>
                        <td>
                          <span className={`dash-badge ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="text-right">
                          <p className="dash-amount">{formatPrice(order.totalAmount)}</p>
                          {unpaid > 0 && <p className="dash-debt">долг {formatPrice(unpaid)}</p>}
                        </td>
                        <td className="text-right dash-paid">
                          <span className={order.paidAmount >= order.totalAmount ? 'paid' : ''}>
                            {formatPrice(order.paidAmount ?? 0)}
                          </span>
                        </td>
                        <td>
                          <button className="dash-eye-btn" onClick={e => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="dash-table-footer">
              <button className="dash-all-btn" onClick={() => navigate('/orders')}>
                Все заказы →
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
