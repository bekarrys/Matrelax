import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { formatPrice, formatDate } from '../../utils/constants';
import { Plus, TrendingUp, Wallet, Loader2, Users } from 'lucide-react';
import Modal from '../../components/Modal/Modal';
import { RoleGuard } from '../../components/guards/RoleGuard';
import './Employees.css';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null); // 'advance', 'worklog', 'add'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({ amount: '', date: '', description: '', productivity: '' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, employee = null) => {
    setModalType(type);
    setSelectedEmployee(employee);
    setFormData({ amount: '', date: new Date().toISOString().split('T')[0], description: '', productivity: '' });
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedEmployee(null);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee && modalType !== 'add') return;
    try {
      if (modalType === 'add') {
        const newEmp = await api.employees.create({ name: formData.name, position: formData.position });
        setEmployees(prev => [...prev, newEmp]);
      } else if (modalType === 'advance') {
        await api.employees.addAdvance(selectedEmployee.id, {
          amount: Number(formData.amount),
          date: formData.date,
          description: formData.description,
        });
      } else if (modalType === 'worklog') {
        await api.employees.addWorklog(selectedEmployee.id, {
          productivity: Number(formData.productivity),
          date: formData.date,
          description: formData.description,
        });
      }
      closeModal();
      fetchEmployees();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  if (loading) return <div className="loading-screen"><Loader2 size={32} className="spin" /></div>;

  const totalAdvances = employees.reduce((sum, e) =>
    sum + (e.advances || []).reduce((s, a) => s + (a.amount || 0), 0), 0);
  const totalProductivity = employees.reduce((sum, e) =>
    sum + (e.worklog || []).reduce((s, w) => s + (w.productivity || 0), 0), 0);

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1>Сотрудники</h1>
          <p className="page-subtitle">Управление авансами и производительностью</p>
        </div>
        <RoleGuard roles={['admin']}>
          <button className="btn-primary" onClick={() => openModal('add')}>
            <Plus size={18} />
            Добавить сотрудника
          </button>
        </RoleGuard>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <Users size={20} />
          <div>
            <span className="stat-label">Сотрудников</span>
            <span className="stat-value">{employees.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <Wallet size={20} />
          <div>
            <span className="stat-label">Общие авансы</span>
            <span className="stat-value warning">{formatPrice(totalAdvances)}</span>
          </div>
        </div>
        <div className="stat-card">
          <TrendingUp size={20} />
          <div>
            <span className="stat-label">Производительность</span>
            <span className="stat-value accent">{formatPrice(totalProductivity)}</span>
          </div>
        </div>
      </div>

      {/* Employees List */}
      {employees.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>Нет сотрудников</p>
          <RoleGuard roles={['admin']}>
            <button className="btn-primary" onClick={() => openModal('add')}>
              <Plus size={16} />
              Добавить первого
            </button>
          </RoleGuard>
        </div>
      ) : (
        <div className="employees-grid">
          {employees.map(emp => {
            const totalAdv = (emp.advances || []).reduce((s, a) => s + (a.amount || 0), 0);
            const totalProd = (emp.worklog || []).reduce((s, w) => s + (w.productivity || 0), 0);
            const balance = totalProd - totalAdv;

            return (
              <div key={emp.id} className="employee-card">
                <div className="employee-header">
                  <div className="employee-avatar">
                    {emp.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3>{emp.name}</h3>
                    <p>{emp.position}</p>
                  </div>
                </div>

                <div className="employee-stats">
                  <div className="emp-stat">
                    <span className="emp-stat-label">Авансы</span>
                    <span className="emp-stat-value warning">{formatPrice(totalAdv)}</span>
                  </div>
                  <div className="emp-stat">
                    <span className="emp-stat-label">Произв.</span>
                    <span className="emp-stat-value accent">{formatPrice(totalProd)}</span>
                  </div>
                  <div className="emp-stat">
                    <span className="emp-stat-label">Баланс</span>
                    <span className={`emp-stat-value ${balance >= 0 ? 'accent' : 'warning'}`}>
                      {formatPrice(balance)}
                    </span>
                  </div>
                </div>

                <RoleGuard roles={['admin']}>
                  <div className="employee-actions">
                    <button className="btn-sm" onClick={() => openModal('advance', emp)}>
                      <Wallet size={14} />
                      Аванс
                    </button>
                    <button className="btn-sm" onClick={() => openModal('worklog', emp)}>
                      <TrendingUp size={14} />
                      Выработка
                    </button>
                  </div>
                </RoleGuard>

                {emp.advances?.length > 0 && (
                  <div className="employee-history">
                    <h4>Авансы</h4>
                    {emp.advances.slice(-5).reverse().map(a => (
                      <div key={a.id} className="history-mini">
                        <span>{formatDate(a.date)}</span>
                        <span>{formatPrice(a.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={!!modalType}
        onClose={closeModal}
        title={
          modalType === 'add' ? 'Новый сотрудник' :
          modalType === 'advance' ? `Аванс — ${selectedEmployee?.name}` :
          `Выработка — ${selectedEmployee?.name}`
        }
      >
        <div className="modal-form">
          {modalType === 'add' && (
            <>
              <div className="form-field">
                <label>Имя</label>
                <input value={formData.name || ''} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} placeholder="Имя сотрудника" />
              </div>
              <div className="form-field">
                <label>Должность</label>
                <input value={formData.position || ''} onChange={e => setFormData(d => ({ ...d, position: e.target.value }))} placeholder="Мастер / Помощник" />
              </div>
            </>
          )}
          {modalType === 'advance' && (
            <>
              <div className="form-field">
                <label>Сумма (KZT)</label>
                <input type="number" value={formData.amount} onChange={e => setFormData(d => ({ ...d, amount: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-field">
                <label>Дата</label>
                <input type="date" value={formData.date} onChange={e => setFormData(d => ({ ...d, date: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Комментарий</label>
                <input value={formData.description || ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} placeholder="Необязательно" />
              </div>
            </>
          )}
          {modalType === 'worklog' && (
            <>
              <div className="form-field">
                <label>Производительность (KZT)</label>
                <input type="number" value={formData.productivity} onChange={e => setFormData(d => ({ ...d, productivity: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-field">
                <label>Дата</label>
                <input type="date" value={formData.date} onChange={e => setFormData(d => ({ ...d, date: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Комментарий</label>
                <input value={formData.description || ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} placeholder="Необязательно" />
              </div>
            </>
          )}
          <button className="btn-primary btn-block" onClick={handleSubmit}>
            Сохранить
          </button>
        </div>
      </Modal>
    </div>
  );
}
