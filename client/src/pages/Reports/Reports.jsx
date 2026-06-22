import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { formatPrice, formatDate } from '../../utils/constants';
import { BarChart3, Calendar, TrendingUp, Loader2, Download } from 'lucide-react';
import './Reports.css';
import DatePickerField from '../../components/DatePickerField/DatePickerField';

export default function Reports() {
  const [reportType, setReportType] = useState('daily');
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const data = await api.reports.daily(selectedDate);
      setDailyReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthly = async () => {
    setLoading(true);
    try {
      const data = await api.reports.monthly(selectedMonth);
      setMonthlyReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (reportType === 'daily') fetchDaily();
    else fetchMonthly();
  };

  const currentReport = reportType === 'daily' ? dailyReport : monthlyReport;

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Отчёты</h1>
          <p className="page-subtitle">Суточные и месячные отчёты</p>
        </div>
      </div>

      {/* Controls */}
      <div className="report-controls">
        <div className="report-type-toggle">
          <button
            className={`toggle-btn ${reportType === 'daily' ? 'active' : ''}`}
            onClick={() => setReportType('daily')}
          >
            <Calendar size={16} />
            За день
          </button>
          <button
            className={`toggle-btn ${reportType === 'monthly' ? 'active' : ''}`}
            onClick={() => setReportType('monthly')}
          >
            <BarChart3 size={16} />
            За месяц
          </button>
        </div>

        <div className="report-date-picker">
          {reportType === 'daily' ? (
            <DatePickerField value={selectedDate} onChange={setSelectedDate} />
          ) : (
            <DatePickerField mode="month" value={selectedMonth} onChange={setSelectedMonth} />
          )}
          <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <TrendingUp size={16} />}
            Сформировать
          </button>
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="loading-report">
          <Loader2 size={40} className="spin" />
          <p>Генерация отчёта...</p>
        </div>
      ) : currentReport ? (
        <div className="report-content">
          {/* Summary Cards */}
          <div className="report-summary">
            <div className="summary-card">
              <span className="summary-label">Заказов</span>
              <span className="summary-value">{currentReport.count}</span>
            </div>
            <div className="summary-card highlight">
              <span className="summary-label">Выручка</span>
              <span className="summary-value">{formatPrice(currentReport.totalRevenue)}</span>
            </div>
            <div className="summary-card highlight-green">
              <span className="summary-label">Оплачено</span>
              <span className="summary-value">{formatPrice(currentReport.totalPaid)}</span>
            </div>
          </div>

          {/* By Sales Point */}
          {currentReport.byPoint && Object.keys(currentReport.byPoint).length > 0 && (
            <div className="report-section">
              <h3>По точкам продаж</h3>
              <div className="report-table">
                {Object.entries(currentReport.byPoint).map(([point, count]) => (
                  <div key={point} className="report-table-row">
                    <span>{point === 'armada' ? 'Армада' : 'Маденият'}</span>
                    <span>{count} заказов</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Models */}
          {currentReport.topModels && currentReport.topModels.length > 0 && (
            <div className="report-section">
              <h3>Топ модели</h3>
              <div className="report-table">
                {currentReport.topModels.map(([model, count], idx) => (
                  <div key={model} className="report-table-row">
                    <span>
                      <span className="top-rank">{idx + 1}</span>
                      {model}
                    </span>
                    <span>{count} шт.</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders List */}
          {currentReport.orders && currentReport.orders.length > 0 && (
            <div className="report-section">
              <h3>Заказы</h3>
              <div className="orders-list">
                {currentReport.orders.map(order => (
                  <div key={order.id} className="order-list-item">
                    <div className="order-list-info">
                      <span className="order-list-number">{order.orderNumber}</span>
                      <span className="order-list-phone">+{order.customerPhone}</span>
                    </div>
                    <div className="order-list-amount">{formatPrice(order.totalAmount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="report-actions">
            <button className="btn-secondary">
              <Download size={16} />
              Экспорт (Google Sheets — скоро)
            </button>
          </div>
        </div>
      ) : (
        <div className="report-empty">
          <BarChart3 size={48} />
          <p>Нажмите «Сформировать» для генерации отчёта</p>
        </div>
      )}
    </div>
  );
}
