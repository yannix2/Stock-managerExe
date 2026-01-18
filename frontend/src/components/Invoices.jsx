import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoiceApi, customerApi } from '../api/stockApi';
import './Invoices.css';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    customerId: '',
    dateFrom: '',
    dateTo: '',
    minTotal: '',
    maxTotal: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    totalInvoices: 0,
    totalQuotes: 0,
    paid: 0,
    pending: 0,
    cancelled: 0,
    nostatus: 0,
    revenue: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invoicesData, customersData] = await Promise.all([
        invoiceApi.getAll(),
        customerApi.getAll()
      ]);
      
      setInvoices(invoicesData || []);
      setFilteredInvoices(invoicesData || []);
      setCustomers(customersData || []);
      calculateStats(invoicesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (invoicesData) => {
    const total = invoicesData.length;
    const invoicesOnly = invoicesData.filter(i => i.type === 'invoice');
    const quotesOnly = invoicesData.filter(i => i.type === 'quote');
    
    // Count all statuses
    const paid = invoicesData.filter(i => i.status === 'paid').length;
    const pending = invoicesData.filter(i => i.status === 'pending').length;
    const cancelled = invoicesData.filter(i => i.status === 'cancelled').length;
    const nostatus = invoicesData.filter(i => !i.status || i.status === 'nostatus').length;
    
    // Calculate revenue only from paid invoices
    const revenue = invoicesData
      .filter(i => i.status === 'paid' && i.type === 'invoice')
      .reduce((sum, i) => sum + (i.total || 0), 0);

    setStats({ 
      total, 
      totalInvoices: invoicesOnly.length,
      totalQuotes: quotesOnly.length,
      paid, 
      pending, 
      cancelled,
      nostatus,
      revenue 
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (filterValues) => {
    let filtered = [...invoices];

    if (filterValues.type) {
      filtered = filtered.filter(inv => inv.type === filterValues.type);
    }

    if (filterValues.status) {
      if (filterValues.status === 'nostatus') {
        filtered = filtered.filter(inv => !inv.status || inv.status === 'nostatus');
      } else {
        filtered = filtered.filter(inv => inv.status === filterValues.status);
      }
    }

    if (filterValues.customerId) {
      filtered = filtered.filter(inv => inv.customerId == filterValues.customerId);
    }

    if (filterValues.dateFrom) {
      filtered = filtered.filter(inv => new Date(inv.date) >= new Date(filterValues.dateFrom));
    }

    if (filterValues.dateTo) {
      filtered = filtered.filter(inv => new Date(inv.date) <= new Date(filterValues.dateTo));
    }

    if (filterValues.minTotal) {
      filtered = filtered.filter(inv => inv.total >= parseFloat(filterValues.minTotal));
    }

    if (filterValues.maxTotal) {
      filtered = filtered.filter(inv => inv.total <= parseFloat(filterValues.maxTotal));
    }

    setFilteredInvoices(filtered);
  };

  const clearFilters = () => {
    const clearedFilters = {
      type: '',
      status: '',
      customerId: '',
      dateFrom: '',
      dateTo: '',
      minTotal: '',
      maxTotal: ''
    };
    setFilters(clearedFilters);
    setFilteredInvoices(invoices);
    setSelectedInvoices([]);
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id == customerId);
    return customer ? customer.name : 'Client inconnu';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: { label: 'Payé', class: 'paid' },
      pending: { label: 'En attente', class: 'pending' },
      cancelled: { label: 'Annulé', class: 'cancelled' },
      nostatus: { label: 'Sans statut', class: 'nostatus' }
    };
    
    const config = statusConfig[status] || { label: 'Sans statut', class: 'nostatus' };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      invoice: { label: 'Facture', class: 'invoice' },
      quote: { label: 'Devis', class: 'quote' }
    };
    
    const config = typeConfig[type] || { label: type, class: 'default' };
    return <span className={`type-badge ${config.class}`}>{config.label}</span>;
  };

  const downloadPDF = async (invoiceId) => {
    try {
      const blob = await invoiceApi.getPDF(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture_${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Erreur lors du téléchargement du PDF');
    }
  };

  const exportInvoices = () => {
    const csvContent = [
      ['Numéro', 'Client', 'Type', 'Status', 'Total', 'Date', 'Date d\'échéance'],
      ...filteredInvoices.map(inv => [
        inv.reference || (inv.type === 'invoice' ? `INV-${inv.id}` : `DEV-${inv.id}`),
        getCustomerName(inv.customerId),
        inv.type === 'invoice' ? 'Facture' : 'Devis',
        inv.status === 'paid' ? 'Payé' : 
        inv.status === 'pending' ? 'En attente' :
        inv.status === 'cancelled' ? 'Annulé' : 'Sans statut',
        `${inv.total?.toFixed(2)} TND`,
        new Date(inv.date).toLocaleDateString('fr-FR'),
        inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '-'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    }
  };

  const deleteInvoices = async () => {
    if (!selectedInvoices.length) {
      alert('Veuillez sélectionner au moins une facture/devis à supprimer');
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedInvoices.length} élément(s) ? Cette action est irréversible.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete one by one or use batch delete if your API supports it
      for (const invoiceId of selectedInvoices) {
        await invoiceApi.delete(invoiceId);
      }
      
      // Refresh the data
      await fetchData();
      setSelectedInvoices([]);
      alert(`${selectedInvoices.length} élément(s) supprimé(s) avec succès`);
    } catch (error) {
      console.error('Error deleting invoices:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteSingleInvoice = async (invoiceId, invoiceReference) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${invoiceReference || invoiceId}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await invoiceApi.delete(invoiceId);
      await fetchData();
      alert('Supprimé avec succès');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="invoices-container">
      <div className="invoices-header">
        <div>
          <h1>Gestion des Factures & Devis</h1>
          <p>{filteredInvoices.length} factures/devis trouvés</p>
        </div>
        <div className="header-actions">
          {selectedInvoices.length > 0 && (
            <button 
              onClick={deleteInvoices} 
              className="btn-danger"
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : `🗑️ Supprimer (${selectedInvoices.length})`}
            </button>
          )}
          <button onClick={exportInvoices} className="btn-secondary">
            📊 Exporter CSV
          </button>
          <Link to="/new-invoice" className="btn-primary">
            + Nouvelle Facture/Devis
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total (Factures + Devis)</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalInvoices}</h3>
          <p>Factures</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalQuotes}</h3>
          <p>Devis</p>
        </div>
        <div className="stat-card success">
          <h3>{stats.paid}</h3>
          <p>Payées</p>
        </div>
        <div className="stat-card warning">
          <h3>{stats.pending}</h3>
          <p>En attente</p>
        </div>
        <div className="stat-card danger">
          <h3>{stats.cancelled}</h3>
          <p>Annulées</p>
        </div>
        <div className="stat-card info">
          <h3>{stats.nostatus}</h3>
          <p>Sans statut</p>
        </div>
        <div className="stat-card revenue">
          <h3>{stats.revenue.toFixed(2)} TND</h3>
          <p>Chiffre d'affaires</p>
        </div>
      </div>

      <div className="filters-section">
        <div className="filters-header">
          <h3>Filtres</h3>
          <button onClick={clearFilters} className="clear-filters">
            Effacer tous les filtres
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Type</label>
            <select name="type" value={filters.type} onChange={handleFilterChange}>
              <option value="">Tous les types</option>
              <option value="invoice">Facture</option>
              <option value="quote">Devis</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">Tous les status</option>
              <option value="pending">En attente</option>
              <option value="paid">Payé</option>
              <option value="cancelled">Annulé</option>
              <option value="nostatus">Sans statut</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Client</label>
            <select name="customerId" value={filters.customerId} onChange={handleFilterChange}>
              <option value="">Tous les clients</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Date de</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Date à</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Montant min (TND)</label>
            <input
              type="number"
              name="minTotal"
              value={filters.minTotal}
              onChange={handleFilterChange}
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="filter-group">
            <label>Montant max (TND)</label>
            <input
              type="number"
              name="maxTotal"
              value={filters.maxTotal}
              onChange={handleFilterChange}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Chargement des factures...</div>
      ) : (
        <div className="invoices-table-container">
          {selectedInvoices.length > 0 && (
            <div className="selection-info">
              <span>{selectedInvoices.length} élément(s) sélectionné(s)</span>
              <button 
                onClick={() => setSelectedInvoices([])} 
                className="btn-text"
              >
                Désélectionner tout
              </button>
            </div>
          )}
          
          <table className="invoices-table">
            <thead>
              <tr>
                <th width="50">
                  <input
                    type="checkbox"
                    checked={filteredInvoices.length > 0 && selectedInvoices.length === filteredInvoices.length}
                    onChange={handleSelectAll}
                    title="Sélectionner tout"
                  />
                </th>
                <th>Numéro</th>
                <th>Client</th>
                <th>Type</th>
                <th>Date</th>
                <th>Échéance</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(invoice => (
                <tr key={invoice.id} className={selectedInvoices.includes(invoice.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => handleSelectInvoice(invoice.id)}
                    />
                  </td>
                  <td>
                    <strong>{invoice.reference || (invoice.type === 'invoice' ? `INV-${invoice.id}` : `DEV-${invoice.id}`)}</strong>
                  </td>
                  <td>{getCustomerName(invoice.customerId)}</td>
                  <td>{getTypeBadge(invoice.type)}</td>
                  <td>{new Date(invoice.date).toLocaleDateString('fr-FR')}</td>
                  <td>
                    {invoice.due_date ? (
                      new Date(invoice.due_date).toLocaleDateString('fr-FR')
                    ) : (
                      <span className="no-data">-</span>
                    )}
                  </td>
                  <td>
                    <strong className="amount">{invoice.total?.toFixed(2)} TND</strong>
                  </td>
                  <td>{getStatusBadge(invoice.status)}</td>
                  <td>
                    <div className="actions">
                      <button
                        onClick={() => downloadPDF(invoice.id)}
                        className="btn-icon"
                        title="Télécharger PDF"
                      >
                        📄
                      </button>
                      <Link
                        to={`/invoices/${invoice.id}`}
                        className="btn-icon"
                        title="Voir détails"
                      >
                        👀
                      </Link>
                      {invoice.status === 'pending' && invoice.type === 'invoice' && (
                        <Link
                          to={`/payment/${invoice.id}`}
                          className="btn-icon success"
                          title="Enregistrer paiement"
                        >
                          💰
                        </Link>
                      )}
                      <button
                        onClick={() => deleteSingleInvoice(invoice.id, invoice.reference || invoice.id)}
                        className="btn-icon danger"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="empty-state">
              <p>Aucune facture ou devis trouvé</p>
              <Link to="/new-invoice" className="btn-primary">
                Créer une première facture
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Invoices;