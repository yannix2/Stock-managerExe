import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../api/stockApi';
import './Customers.css';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await customerApi.getAll();
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name?.toLowerCase().includes(term) ||
        customer.email?.toLowerCase().includes(term) ||
        customer.phone?.includes(term) ||
        customer.address?.toLowerCase().includes(term)
      );
      setFilteredCustomers(filtered);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir désactiver ce client?')) {
      try {
        await customerApi.delete(id);
        alert('Client désactivé avec succès');
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const exportCustomers = () => {
    const csvContent = [
      ['Statut','Nom', 'Email', 'Téléphone', 'Adresse', 'Date de création'],
      ...customers.map(c => [
        c.is_active ? 'Actif' : 'Inactif',
        c.name,
        c.email || '',
        c.phone || '',
        c.address || '',
        new Date(c.createdAt).toLocaleDateString('fr-FR')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="customers-container">
      <div className="customers-header">
        <div>
          <h1>Gestion des Clients</h1>
          <p>{filteredCustomers.length} clients trouvés</p>
        </div>
        <div className="header-actions">
          <Link to="/new-customer" className="btn-primary">
            + Nouveau Client
          </Link>
        </div>
      </div>

      <div className="search-section">
        <input
          type="text"
          placeholder="Rechercher un client par nom, email, téléphone..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />
        <button onClick={() => setSearchTerm('')} className="clear-search">
          Effacer
        </button>
      </div>

      {isLoading ? (
        <div className="loading">Chargement des clients...</div>
      ) : (
        <div className="customers-table-container">
          <table className="customers-table">
            <thead>
              <tr>
              <th>Status</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Adresse</th>
                <th>Date d'ajout</th>
                <th>Actions</th>
              </tr>
            </thead>
<tbody>
  {filteredCustomers.map(customer => (
    <tr key={customer.id} onClick={() => setSelectedCustomer(customer)}>
      <td>
        <div className="status-cell">
          {customer.is_active ? (
            <span title="Client actif">
              <span className="status-icon">🟢</span>
          
            </span>
          ) : (
            <span className="" title="Client inactif">
              <span className="status-icon">🔴</span>
              
            </span>
          )}
        </div>
      </td>
      <td>
        <div className="customer-name">
          <strong>{customer.name}</strong>
          {customer.notes && (
            <div className="customer-notes" title={customer.notes}>
              📝
            </div>
          )}
        </div>
      </td>
      <td>
        {customer.email ? (
          <a href={`mailto:${customer.email}`} className="email-link">
            {customer.email}
          </a>
        ) : (
          <span className="no-data">-</span>
        )}
      </td>
      <td>
        {customer.phone ? (
          <a href={`tel:${customer.phone}`} className="phone-link">
            {customer.phone}
          </a>
        ) : (
          <span className="no-data">-</span>
        )}
      </td>
      <td>
        <div className="address-cell">
          {customer.address || <span className="no-data">-</span>}
        </div>
      </td>
      <td>
        {new Date(customer.createdAt).toLocaleDateString('fr-FR')}
      </td>
      <td>
        <div className="actions" onClick={(e) => e.stopPropagation()}>
          <Link to={`/edit-customer/${customer.id}`} className="btn-icon edit" title="Modifier">
            ✏️
          </Link>
          <button
            onClick={() => handleDelete(customer.id)}
            className="btn-icon danger"
            title="Supprimer"
          >
            🗑️
          </button>
          <Link to={`/customer-history/${customer.id}`} className="btn-icon history" title="Historique">
             👀
          </Link>
        </div>
      </td>
    </tr>
  ))}
</tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="empty-state">
              <p>Aucun client trouvé</p>
              <Link to="/new-customer" className="btn-primary">
                Ajouter un premier client
              </Link>
            </div>
          )}
        </div>
      )}

      {selectedCustomer && (
        <div className="customer-detail-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Détails du Client</h3>
              <button onClick={() => setSelectedCustomer(null)} className="close-btn">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>Informations Personnelles</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Nom:</label>
                    <span>{selectedCustomer.name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedCustomer.email || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone:</label>
                    <span>{selectedCustomer.phone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Adresse:</label>
                    <span>{selectedCustomer.address || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date d'ajout:</label>
                    <span>{new Date(selectedCustomer.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <Link to={`/edit-customer/${selectedCustomer.id}`} className="btn-primary">
                Modifier ce client
              </Link>
              <button onClick={() => setSelectedCustomer(null)} className="btn-secondary">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;