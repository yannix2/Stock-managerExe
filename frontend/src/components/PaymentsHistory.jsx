import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paymentApi } from '../api/stockApi';
import './PaymentsHistory.css';

const PaymentsHistory = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    todayAmount: 0,
    byMethod: {}
  });
  const [filters, setFilters] = useState({
    method: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
    customerName: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState(null);
  const [editData, setEditData] = useState({
    amount: '',
    method: 'cash',
    payment_date: ''
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const paymentsData = await paymentApi.getAll();
      setPayments(paymentsData || []);
      setFilteredPayments(paymentsData || []);
      calculateStats(paymentsData || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (paymentsData) => {
    const total = paymentsData.length;
    const totalAmount = paymentsData.reduce((sum, p) => sum + p.amount, 0);
    
    const today = new Date().toISOString().split('T')[0];
    const todayAmount = paymentsData
      .filter(p => p.payment_date && p.payment_date.startsWith(today))
      .reduce((sum, p) => sum + p.amount, 0);
    
    const byMethod = paymentsData.reduce((acc, payment) => {
      acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
      return acc;
    }, {});

    setStats({
      total,
      totalAmount,
      todayAmount,
      byMethod
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (filterValues) => {
    let filtered = [...payments];

    if (filterValues.method) {
      filtered = filtered.filter(p => p.method === filterValues.method);
    }

    if (filterValues.customerName) {
      filtered = filtered.filter(p => 
        p.Invoice?.Customer?.name?.toLowerCase().includes(filterValues.customerName.toLowerCase())
      );
    }

    if (filterValues.dateFrom) {
      filtered = filtered.filter(p => 
        new Date(p.payment_date || p.createdAt) >= new Date(filterValues.dateFrom)
      );
    }

    if (filterValues.dateTo) {
      filtered = filtered.filter(p => 
        new Date(p.payment_date || p.createdAt) <= new Date(filterValues.dateTo + 'T23:59:59')
      );
    }

    if (filterValues.minAmount) {
      filtered = filtered.filter(p => p.amount >= parseFloat(filterValues.minAmount));
    }

    if (filterValues.maxAmount) {
      filtered = filtered.filter(p => p.amount <= parseFloat(filterValues.maxAmount));
    }

    setFilteredPayments(filtered);
  };

  const clearFilters = () => {
    const clearedFilters = {
      method: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
      customerName: ''
    };
    setFilters(clearedFilters);
    setFilteredPayments(payments);
  };

  const getUniqueCustomers = () => {
    const customers = payments
      .map(p => p.Invoice?.Customer?.name)
      .filter(name => name)
      .filter((value, index, self) => self.indexOf(value) === index);
    return customers.sort();
  };

  const handleDeletePayment = (payment) => {
    setPaymentToDelete(payment);
    setShowDeleteModal(true);
  };

  const confirmDeletePayment = async () => {
    try {
      await paymentApi.delete(paymentToDelete.id);
      await fetchPayments();
      setShowDeleteModal(false);
      setPaymentToDelete(null);
      alert('Paiement supprimé avec succès');
    } catch (err) {
      console.error('Error deleting payment:', err);
      alert('Erreur lors de la suppression du paiement');
    }
  };

  const handleEditPayment = (payment) => {
    setPaymentToEdit(payment);
    setEditData({
      amount: payment.amount,
      method: payment.method,
      payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || '' : value
    }));
  };

  const submitEditPayment = async () => {
    try {
      const formattedDate = editData.payment_date ? 
        new Date(editData.payment_date).toISOString() : 
        paymentToEdit.payment_date;
      
      await paymentApi.update(paymentToEdit.id, {
        ...editData,
        payment_date: formattedDate
      });
      await fetchPayments();
      setShowEditModal(false);
      setPaymentToEdit(null);
      alert('Paiement modifié avec succès');
    } catch (err) {
      console.error('Error updating payment:', err);
      alert('Erreur lors de la modification du paiement');
    }
  };

  const exportPayments = () => {
    const csvContent = [
      ['ID', 'Facture', 'Client', 'Montant', 'Méthode', 'Date Paiement'],
      ...filteredPayments.map(p => [
        p.id,
        `INV-${p.invoiceId}`,
        p.Invoice?.Customer?.name || 'Client inconnu',
        `${p.amount.toFixed(2)} TND`,
        getMethodLabel(p.method),
        new Date(p.payment_date || p.createdAt).toLocaleDateString('fr-FR')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Date invalide';
    }
  };

  const getMethodLabel = (method) => {
    const labels = {
      cash: 'Espèces',
      check: 'Chèque',
      card: 'Carte',
      transfer: 'Virement',
      other: 'Autre'
    };
    return labels[method] || method;
  };

  const getMethodIcon = (method) => {
    const icons = {
      cash: '💵',
      check: '🏦',
      card: '💳',
      transfer: '🔄',
      other: '💰'
    };
    return icons[method] || '💰';
  };

  const getMethodClass = (method) => {
    const classes = {
      cash: 'cash',
      check: 'check',
      card: 'card',
      transfer: 'transfer',
      other: 'other'
    };
    return classes[method] || 'other';
  };

  return (
    <div className="payments-history-container">
      {/* Header */}
      <div className="payments-header">
        <div className="header-left">
          <h1>Historique des Paiements</h1>
          <p className="subtitle">
            {filteredPayments.length} paiement(s) • {stats.totalAmount.toFixed(2)} TND total
          </p>
        </div>
        <div className="header-actions">
          <Link to="/invoices" className="btn-secondary">
            ← Retour aux Factures
          </Link>
          <button onClick={exportPayments} className="btn-primary">
            <span className="icon">📥</span> Exporter CSV
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Paiements</p>
          </div>
        </div>
        
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{stats.totalAmount.toFixed(2)} TND</h3>
            <p>Montant Total</p>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>{stats.todayAmount.toFixed(2)} TND</h3>
            <p>Aujourd'hui</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{getUniqueCustomers().length}</h3>
            <p>Clients Uniques</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>Filtres</h3>
          <button onClick={clearFilters} className="clear-filters">
            Effacer les filtres
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Nom du Client</label>
            <input
              type="text"
              name="customerName"
              value={filters.customerName}
              onChange={handleFilterChange}
              placeholder="Rechercher par client..."
              list="customers-list"
            />
            <datalist id="customers-list">
              {getUniqueCustomers().map((customer, index) => (
                <option key={index} value={customer} />
              ))}
            </datalist>
          </div>
          
          <div className="filter-group">
            <label>Méthode de Paiement</label>
            <select name="method" value={filters.method} onChange={handleFilterChange}>
              <option value="">Toutes les méthodes</option>
              <option value="cash">Espèces</option>
              <option value="check">Chèque</option>
              <option value="card">Carte bancaire</option>
              <option value="transfer">Virement</option>
              <option value="other">Autre</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Date de début</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Date de fin</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Montant minimum (TND)</label>
            <input
              type="number"
              name="minAmount"
              value={filters.minAmount}
              onChange={handleFilterChange}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          
          <div className="filter-group">
            <label>Montant maximum (TND)</label>
            <input
              type="number"
              name="maxAmount"
              value={filters.maxAmount}
              onChange={handleFilterChange}
              min="0"
              step="0.01"
              placeholder="Sans limite"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="loading">
          Chargement des paiements...
        </div>
      ) : (
        <div className="payments-table-container">
          <div className="table-header">
            <div className="table-summary">
              <strong>{filteredPayments.length}</strong> paiement(s) trouvé(s)
            </div>
            <div className="table-actions">
              <span className="total-amount">
                Total: <strong>{filteredPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} TND</strong>
              </span>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>Aucun paiement trouvé</h3>
              <p>Modifiez vos critères de recherche ou ajoutez un nouveau paiement.</p>
            </div>
          ) : (
            <div className="payments-table-wrapper">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Facture</th>
                    <th>Client</th>
                    <th>Montant</th>
                    <th>Méthode</th>
                    <th>Date</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(payment => (
                    <tr key={payment.id} className="payment-row">
                      <td>
                        <Link 
                          to={`/invoices/${payment.invoiceId}`} 
                          className="invoice-link"
                        >
                          {payment.Invoice?.reference|| payment.invoiceId}
                        </Link>
                      </td>
                      <td>
                        <div className="customer-info">
                          <div className="customer-name">
                            {payment.Invoice?.Customer?.name || 'Client inconnu'}
                          </div>
                          {payment.Invoice?.Customer?.phone && (
                            <div className="customer-phone">
                              {payment.Invoice.Customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong className="payment-amount">{payment.amount.toFixed(2)} TND</strong>
                      </td>
                      <td>
                        <div className={`${getMethodClass(payment.method)}`}>
                          <span className="">{getMethodIcon(payment.method)}</span>
                          <span className="">{getMethodLabel(payment.method)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="payment-date">
                          {formatDate(payment.payment_date || payment.createdAt)}
                        </div>
                      </td>
                      <td className="actions">
                        <button
                          onClick={() => handleEditPayment(payment)}
                          className="btn-icon edit"
                          title="Modifier le paiement"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeletePayment(payment)}
                          className="btn-icon delete"
                          title="Supprimer le paiement"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && paymentToDelete && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="modal-header">
              <h3>Confirmer la suppression</h3>
              <button onClick={() => setShowDeleteModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action est irréversible.</p>
              <div className="payment-details">
                <div className="detail-row">
                  <span className="detail-label">Facture:</span>
                  <span className="detail-value">INV-{paymentToDelete.invoiceId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Client:</span>
                  <span className="detail-value">
                    {paymentToDelete.Invoice?.Customer?.name || 'Client inconnu'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Montant:</span>
                  <span className="detail-value">{paymentToDelete.amount.toFixed(2)} TND</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Méthode:</span>
                  <span className="detail-value">{getMethodLabel(paymentToDelete.method)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">
                Annuler
              </button>
              <button onClick={confirmDeletePayment} className="btn-danger">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && paymentToEdit && (
        <div className="modal-overlay">
          <div className="modal edit-modal">
            <div className="modal-header">
              <h3>Modifier le paiement</h3>
              <button onClick={() => setShowEditModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="payment-info">
                <div className="info-row">
                  <span className="info-label">Facture:</span>
                  <span className="info-value">INV-{paymentToEdit.invoiceId}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Client:</span>
                  <span className="info-value">
                    {paymentToEdit.Invoice?.Customer?.name || 'Client inconnu'}
                  </span>
                </div>
              </div>
              
              <div className="form-group">
                <label>Montant (TND) *</label>
                <input
                  type="number"
                  name="amount"
                  value={editData.amount}
                  onChange={handleEditChange}
                  min="0.01"
                  step="0.01"
                  required
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label>Méthode de paiement *</label>
                <select
                  name="method"
                  value={editData.method}
                  onChange={handleEditChange}
                  className="form-control"
                >
                  <option value="cash">Espèces</option>
                  <option value="check">Chèque</option>
                  <option value="card">Carte bancaire</option>
                  <option value="transfer">Virement</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Date du paiement</label>
                <input
                  type="date"
                  name="payment_date"
                  value={editData.payment_date}
                  onChange={handleEditChange}
                  className="form-control"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowEditModal(false)} className="btn-secondary">
                Annuler
              </button>
              <button onClick={submitEditPayment} className="btn-primary">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsHistory;