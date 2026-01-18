import React, { useState, useEffect } from 'react';
import { alertApi, productApi } from '../api/stockApi';
import './Alerts.css';
import { Link } from 'react-router-dom';
const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [products, setProducts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, resolved, unresolved

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [alertsData, productsData] = await Promise.all([
        alertApi.getAll(),
        productApi.getAll()
      ]);
      
      setAlerts(alertsData || []);
      
      // Create products map for quick lookup
      const productsMap = {};
      (productsData || []).forEach(product => {
        productsMap[product.id] = product;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      // Note: You'll need to add a resolve endpoint to your API
      // For now, we'll just update locally
      const updatedAlerts = alerts.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true, resolved_at: new Date() } : alert
      );
      setAlerts(updatedAlerts);
      
      // TODO: Call API to resolve alert
      // await alertApi.resolve(alertId);
      
      alert('Alerte marquée comme résolue');
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Erreur lors de la résolution de l\'alerte');
    }
  };

  const getFilteredAlerts = () => {
    switch (filter) {
      case 'resolved':
        return alerts.filter(alert => alert.resolved);
      case 'unresolved':
        return alerts.filter(alert => !alert.resolved);
      default:
        return alerts;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'low_stock':
        return '⚠️';
      case 'out_of_stock':
        return '🛑';
      default:
        return 'ℹ️';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'low_stock':
        return '#f59e0b';
      case 'out_of_stock':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getAlertTypeText = (type) => {
    switch (type) {
      case 'low_stock':
        return 'Stock Faible';
      case 'out_of_stock':
        return 'Rupture de Stock';
      default:
        return 'Alerte';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefresh = () => {
    fetchData();
  };

  const filteredAlerts = getFilteredAlerts();
  const unresolvedCount = alerts.filter(a => !a.resolved).length;
  const resolvedCount = alerts.filter(a => a.resolved).length;

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <div>
          <h1>Gestion des Alertes</h1>
          <p>Surveillance du stock en temps réel</p>
        </div>
        <div className="header-actions">
       
        </div>
      </div>

      <div className="alerts-stats">
        <div className="stat-card">
          <h3>{alerts.length}</h3>
          <p>Total des alertes</p>
        </div>
        <div className="stat-card warning">
          <h3>{unresolvedCount}</h3>
          <p>Alertes non résolues</p>
        </div>
        <div className="stat-card success">
          <h3>{resolvedCount}</h3>
          <p>Alertes résolues</p>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Toutes ({alerts.length})
          </button>
          <button
            className={`filter-tab ${filter === 'unresolved' ? 'active' : ''}`}
            onClick={() => setFilter('unresolved')}
          >
            Non résolues ({unresolvedCount})
          </button>
          <button
            className={`filter-tab ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            Résolues ({resolvedCount})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Chargement des alertes...</div>
      ) : (
        <div className="alerts-list">
          {filteredAlerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>Aucune alerte trouvée</h3>
              <p>
                {filter === 'unresolved' 
                  ? 'Toutes les alertes sont résolues. Bon travail !'
                  : 'Aucune alerte à afficher avec les filtres sélectionnés.'
                }
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const product = products[alert.productId];
              return (
                <div key={alert.id} className="alert-card">
                  <div className="alert-header">
                    <div className="alert-icon" style={{ color: getAlertColor(alert.type) }}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="alert-title">
                      <h3>{getAlertTypeText(alert.type)}</h3>
                      <div className="alert-time">
                        {formatDate(alert.createdAt)}
                      </div>
                    </div>
                    <div className="alert-status">
                      {alert.resolved ? (
                        <span className="status-resolved">
                          ✅ Résolue le {formatDate(alert.resolved_at)}
                        </span>
                      ) : (
                        <span className="status-unresolved">
                          ⏳ En attente
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="alert-body">
                    <div className="alert-message">
                      <p>{alert.message}</p>
                    </div>
                    
                    {product && (
                      <div className="product-info">
                        <div className="product-header">
                          <h4>Produit concerné:</h4>
                          <span className="product-ref">{product.reference}</span>
                        </div>
                        <div className="product-details">
                          <div className="detail">
                            <span className="label">Nom:</span>
                            <span className="value">{product.name}</span>
                          </div>
                          <div className="detail">
                            <span className="label">Stock actuel:</span>
                            <span className={`value ${product.quantity_in_stock <= 0 ? 'danger' : 'warning'}`}>
                              {product.quantity_in_stock} unités
                            </span>
                          </div>
                          <div className="detail">
                            <span className="label">Seuil d'alerte:</span>
                            <span className="value">{product.threshold} unités</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="alert-footer">
                    {!alert.resolved && product && (
                   <Link to={`/edit-product/${product.id}`} className="btn-primary">
          Voir et Régler Produit
        </Link>
                    )}
                    
                    
                    {alert.resolved && (
                      <span className="resolved-info">
                        Cette alerte a été résolue
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="alerts-legend">
        <h4>Légende des alertes:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-icon">⚠️</span>
            <span>Stock faible</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🛑</span>
            <span>Rupture de stock</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">⏳</span>
            <span>En attente de résolution</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">✅</span>
            <span>Résolue</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;