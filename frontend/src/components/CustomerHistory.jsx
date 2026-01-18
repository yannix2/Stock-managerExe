import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { customerApi, invoiceApi, paymentApi } from '../api/stockApi';
import './CustomerHistory.css';

const CustomerHistory = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
    lastInvoice: null,
    lastPayment: null
  });

  // Invoice filters
  const [invoiceFilters, setInvoiceFilters] = useState({
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });

  // Payment filters
  const [paymentFilters, setPaymentFilters] = useState({
    method: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    setIsLoading(true);
    try {
      // Fetch customer data
      const customerData = await customerApi.getById(id);
      setCustomer(customerData);

      // Fetch customer invoices
      const invoicesData = await invoiceApi.getByCustomer(id);
      setInvoices(invoicesData || []);
      setFilteredInvoices(invoicesData || []);

      // Fetch all payments and filter by customer
      const allPayments = await paymentApi.getAll();
      const customerPayments = allPayments.filter(payment => 
        payment.Invoice?.customerId == id
      );
      setPayments(customerPayments || []);
      setFilteredPayments(customerPayments || []);

      calculateStats(invoicesData || [], customerPayments || []);
    } catch (err) {
      console.error('Error fetching customer data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (invoicesData, paymentsData) => {
    const totalInvoices = invoicesData.length;
    const totalAmount = invoicesData.reduce((sum, inv) => sum + inv.total, 0);
    
    const totalPaid = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPending = totalAmount - totalPaid;

    const lastInvoice = invoicesData.length > 0 
      ? [...invoicesData].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : null;

    const lastPayment = paymentsData.length > 0
      ? [...paymentsData].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0]
      : null;

    setStats({
      totalInvoices,
      totalAmount,
      totalPaid,
      totalPending,
      lastInvoice,
      lastPayment
    });
  };

  const handleInvoiceFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...invoiceFilters, [name]: value };
    setInvoiceFilters(newFilters);
    applyInvoiceFilters(newFilters);
  };

  const applyInvoiceFilters = (filterValues) => {
    let filtered = [...invoices];

    if (filterValues.type) {
      filtered = filtered.filter(inv => inv.type === filterValues.type);
    }

    if (filterValues.status) {
      filtered = filtered.filter(inv => inv.status === filterValues.status);
    }

    if (filterValues.dateFrom) {
      filtered = filtered.filter(inv => new Date(inv.date) >= new Date(filterValues.dateFrom));
    }

    if (filterValues.dateTo) {
      filtered = filtered.filter(inv => new Date(inv.date) <= new Date(filterValues.dateTo + 'T23:59:59'));
    }

    if (filterValues.minAmount) {
      filtered = filtered.filter(inv => inv.total >= parseFloat(filterValues.minAmount));
    }

    if (filterValues.maxAmount) {
      filtered = filtered.filter(inv => inv.total <= parseFloat(filterValues.maxAmount));
    }

    setFilteredInvoices(filtered);
  };

  const handlePaymentFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...paymentFilters, [name]: value };
    setPaymentFilters(newFilters);
    applyPaymentFilters(newFilters);
  };

  const applyPaymentFilters = (filterValues) => {
    let filtered = [...payments];

    if (filterValues.method) {
      filtered = filtered.filter(p => p.method === filterValues.method);
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
    if (activeTab === 'invoices') {
      setInvoiceFilters({
        type: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: ''
      });
      setFilteredInvoices(invoices);
    } else {
      setPaymentFilters({
        method: '',
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: ''
      });
      setFilteredPayments(payments);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status) => {
    const labels = {
      paid: 'Payé',
      pending: 'En attente',
      partially_paid: 'Partiellement payé',
      cancelled: 'Annulé'
    };
    return labels[status] || status;
  };

  const getStatusClass = (status) => {
    const classes = {
      paid: 'paid',
      pending: 'pending',
      partially_paid: 'partially_paid',
      cancelled: 'cancelled'
    };
    return classes[status] || '';
  };

  const getTypeLabel = (type) => {
    return type === 'invoice' ? 'Facture' : 'Devis';
  };

  const getTypeClass = (type) => {
    return type === 'invoice' ? 'invoice' : 'quote';
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

  const calculateInvoicePaidAmount = (invoiceId) => {
    return payments
      .filter(p => p.invoiceId == invoiceId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement des données du client...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="error-container">
        <div className="error-icon">👤</div>
        <h2>Client non trouvé</h2>
        <p>Le client que vous recherchez n'existe pas.</p>
        <Link to="/customers" className="btn-primary">
          ← Retour aux clients
        </Link>
      </div>
    );
  }

  return (
    <div className="customer-history-container">
      {/* Header */}
      <div className="customer-header">
        <div className="header-left">
          <button onClick={() => window.history.back()} className="btn-back">
            ← Retour
          </button>
          <div className="customer-title">
            <h1>{customer.name}</h1>
            <p className="customer-id">Client #{customer.id}</p>
          </div>
        </div>
        <div className="header-actions">
          <Link to={`/edit-customer/${id}`} className="btn-secondary">
            ✏️ Modifier
          </Link>
          <Link to="/customers" className="btn-primary">
            📋 Liste clients
          </Link>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="customer-info-card">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Téléphone</span>
            <span className="info-value">{customer.phone || 'Non renseigné'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email</span>
            <span className="info-value">{customer.email || 'Non renseigné'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Adresse</span>
            <span className="info-value">{customer.address || 'Non renseignée'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Statut</span>
            <span className={`status-badge ${customer.is_active ? 'active' : 'inactive'}`}>
              {customer.is_active ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>{stats.totalInvoices}</h3>
            <p>Documents</p>
          </div>
        </div>
        
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{stats.totalAmount.toFixed(2)} TND</h3>
            <p>Total Facturé</p>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.totalPaid.toFixed(2)} TND</h3>
            <p>Total Payé</p>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.totalPending.toFixed(2)} TND</h3>
            <p>En attente</p>
          </div>
        </div>
      </div>

      {/* Last Activity */}
      <div className="last-activity">
        <div className="activity-card">
          <h3>Dernière facture</h3>
          {stats.lastInvoice ? (
            <>
              <p className="activity-details">
                {getTypeLabel(stats.lastInvoice.type)} #{stats.lastInvoice.id}
              </p>
              <p className="activity-date">{formatDate(stats.lastInvoice.date)}</p>
              <p className="activity-amount">{stats.lastInvoice.total.toFixed(2)} TND</p>
              <Link to={`/invoices/${stats.lastInvoice.id}`} className="btn-text">
                Voir la facture →
              </Link>
            </>
          ) : (
            <p className="no-activity">Aucune facture</p>
          )}
        </div>
        <div className="activity-card">
          <h3>Dernier paiement</h3>
          {stats.lastPayment ? (
            <>
              <p className="activity-details">
                {getMethodLabel(stats.lastPayment.method)}
              </p>
              <p className="activity-date">{formatDate(stats.lastPayment.payment_date)}</p>
              <p className="activity-amount">{stats.lastPayment.amount.toFixed(2)} TND</p>
              <Link to={`/invoices/${stats.lastPayment.invoiceId}`} className="btn-text">
                Voir la facture →
              </Link>
            </>
          ) : (
            <p className="no-activity">Aucun paiement</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            📄 Factures & Devis ({invoices.length})
          </button>
          <button
            className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            💰 Paiements ({payments.length})
          </button>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filters-header">
            <h3>🔍 Filtres</h3>
            <button onClick={clearFilters} className="clear-filters">
              Effacer les filtres
            </button>
          </div>
          
          {activeTab === 'invoices' ? (
            <div className="filters-grid">
              <div className="filter-group">
                <label>Type</label>
                <select name="type" value={invoiceFilters.type} onChange={handleInvoiceFilterChange}>
                  <option value="">Tous les types</option>
                  <option value="invoice">Facture</option>
                  <option value="quote">Devis</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Statut</label>
                <select name="status" value={invoiceFilters.status} onChange={handleInvoiceFilterChange}>
                  <option value="">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="partially_paid">Partiellement payé</option>
                  <option value="paid">Payé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Date de début</label>
                <input
                  type="date"
                  name="dateFrom"
                  value={invoiceFilters.dateFrom}
                  onChange={handleInvoiceFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label>Date de fin</label>
                <input
                  type="date"
                  name="dateTo"
                  value={invoiceFilters.dateTo}
                  onChange={handleInvoiceFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label>Montant min</label>
                <input
                  type="number"
                  name="minAmount"
                  value={invoiceFilters.minAmount}
                  onChange={handleInvoiceFilterChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              
              <div className="filter-group">
                <label>Montant max</label>
                <input
                  type="number"
                  name="maxAmount"
                  value={invoiceFilters.maxAmount}
                  onChange={handleInvoiceFilterChange}
                  min="0"
                  step="0.01"
                  placeholder="∞"
                />
              </div>
            </div>
          ) : (
            <div className="filters-grid">
              <div className="filter-group">
                <label>Méthode</label>
                <select name="method" value={paymentFilters.method} onChange={handlePaymentFilterChange}>
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
                  value={paymentFilters.dateFrom}
                  onChange={handlePaymentFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label>Date de fin</label>
                <input
                  type="date"
                  name="dateTo"
                  value={paymentFilters.dateTo}
                  onChange={handlePaymentFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label>Montant min</label>
                <input
                  type="number"
                  name="minAmount"
                  value={paymentFilters.minAmount}
                  onChange={handlePaymentFilterChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              
              <div className="filter-group">
                <label>Montant max</label>
                <input
                  type="number"
                  name="maxAmount"
                  value={paymentFilters.maxAmount}
                  onChange={handlePaymentFilterChange}
                  min="0"
                  step="0.01"
                  placeholder="∞"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="tab-content">
          {activeTab === 'invoices' ? (
            <div className="invoices-table-container">
              <div className="table-header">
                <div className="table-summary">
                  <strong>{filteredInvoices.length}</strong> document(s) trouvé(s)
                </div>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <h3>Aucun document trouvé</h3>
                  <p>Modifiez vos critères de recherche.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Payé</th>
                        <th>Reste</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(invoice => {
                        const paidAmount = calculateInvoicePaidAmount(invoice.id);
                        const remaining = invoice.total - paidAmount;
                        
                        return (
                          <tr key={invoice.id} className="data-row">
                            <td>
                              <span className={`type-badge ${getTypeClass(invoice.type)}`}>
                                {getTypeLabel(invoice.type)}
                              </span>
                            </td>
                            <td>
                              <span className="invoice-id">INV-{invoice.id}</span>
                              {invoice.reference && (
                                <div className="invoice-ref">Ref: {invoice.reference}</div>
                              )}
                            </td>
                            <td>{formatDate(invoice.date)}</td>
                            <td>
                              <strong className="amount">{invoice.total.toFixed(2)} TND</strong>
                            </td>
                            <td>
                              <span className="paid-amount">{paidAmount.toFixed(2)} TND</span>
                            </td>
                            <td>
                              <span className={`remaining-amount ${remaining > 0 ? 'pending' : 'paid'}`}>
                                {remaining.toFixed(2)} TND
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${getStatusClass(invoice.status)}`}>
                                {getStatusLabel(invoice.status)}
                              </span>
                            </td>
                            <td className="actions">
                              <Link 
                                to={`/invoices/${invoice.id}`}
                                className="btn-icon view"
                                title="Voir"
                              >
                                👁️
                              </Link>
                              <Link 
                                to={`/invoices/${invoice.id}/pdf`}
                                className="btn-icon pdf"
                                title="PDF"
                              >
                                📄
                              </Link>
                              {invoice.type === 'invoice' && remaining > 0 && (
                                <Link 
                                  to={`/invoices/${invoice.id}/payment`}
                                  className="btn-icon payment"
                                  title="Paiement"
                                >
                                  💳
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
                  <div className="empty-icon">💰</div>
                  <h3>Aucun paiement trouvé</h3>
                  <p>Modifiez vos critères de recherche.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Facture</th>
                        <th>Montant</th>
                        <th>Méthode</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map(payment => (
                        <tr key={payment.id} className="data-row">
                          <td>
                            <span className="payment-id">PAY-{payment.id}</span>
                          </td>
                          <td>
                            <Link 
                              to={`/invoices/${payment.invoiceId}`}
                              className="invoice-link"
                            >
                              INV-{payment.invoiceId}
                            </Link>
                          </td>
                          <td>
                            <strong className="amount">{payment.amount.toFixed(2)} TND</strong>
                          </td>
                          <td>
                            <span className={`payment-method ${getMethodClass(payment.method)}`}>
                              {getMethodLabel(payment.method)}
                            </span>
                          </td>
                          <td>{formatDateTime(payment.payment_date || payment.createdAt)}</td>
                          <td className="actions">
                            <Link 
                              to={`/invoices/${payment.invoiceId}`}
                              className="btn-icon view"
                              title="Voir la facture"
                            >
                              👁️
                            </Link>
                            <Link 
                              to={`/invoices/${payment.invoiceId}/payment`}
                              className="btn-icon payment"
                              title="Gérer les paiements"
                            >
                              💳
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerHistory;