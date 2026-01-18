import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi, invoiceApi, customerApi, alertApi } from '../api/stockApi';
import './Dashboard.css';

const Dashboard = ({ stats = {}, onRefresh }) => {
  const [dashboardData, setDashboardData] = useState({
    recentProducts: [],
    lowStockProducts: [],
    recentInvoices: [],
    recentAlerts: [],
    monthlyRevenue: 0,
    dailySales: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today'); // today, week, month

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [products, lowStockData, invoices, customers, alerts] = await Promise.all([
        productApi.getAll(),
        productApi.getLowStock(),
        invoiceApi.getAll(),
        customerApi.getAll(),
        alertApi.getAll()
      ]);
      
      // Filter data based on time range
      const now = new Date();
      const filteredInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.date);
        switch (timeRange) {
          case 'today':
            return invoiceDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return invoiceDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            return invoiceDate >= monthAgo;
          default:
            return true;
        }
      });

      // Calculate metrics
      const paidInvoices = filteredInvoices.filter(inv => inv.status === 'paid');
      const monthlyRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const dailySales = paidInvoices.length;

      // Get recent data
      const recentProducts = [...products]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      const recentInvoices = [...invoices]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      const recentAlerts = [...alerts]
        .filter(alert => !alert.resolved)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setDashboardData({
        recentProducts,
        lowStockProducts: lowStockData.products || [],
        recentInvoices,
        recentAlerts,
        monthlyRevenue,
        dailySales
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ icon, title, value, change, color, link }) => (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-header">
          <h3>{title}</h3>
          {change && <span className="stat-change">{change}</span>}
        </div>
        <div className="stat-value">{value}</div>
        {link && (
          <Link to={link} className="stat-link">
            Voir détails →
          </Link>
        )}
      </div>
    </div>
  );

  const ProductItem = ({ product }) => (
    <div className="product-item">
      <div className="product-info">
        <div className="product-name">
          <strong>{product.name}</strong>
          <span className="product-ref">{product.reference}</span>
        </div>
        <div className="product-category">{product.category}</div>
      </div>
      <div className={`stock-badge ${
        product.quantity_in_stock <= 0 ? 'out-of-stock' :
        product.quantity_in_stock <= product.threshold ? 'low-stock' : 'in-stock'
      }`}>
        {product.quantity_in_stock} unités
      </div>
    </div>
  );

const InvoiceItem = ({ invoice }) => {

const customerName =
  invoice.Customer?.name || 'Client inconnu';

  return (
    <div className="invoice-item">
      <div className="invoice-header">
        <strong>
          {invoice.type === 'quote'
            ? `DEV-${invoice.id}`
            : invoice.reference || `INV-${invoice.id}`}
        </strong>

        {invoice.type === 'invoice' && (
          <span className={`invoice-status ${invoice.status}`}>
            {invoice.status === 'paid' ? 'Payé' : 'En attente'}
          </span>
        )}
      </div>

      <div className="invoice-details">
        <div className="customer-name">
          {customerName|| 'Client inconnu'}
        </div>

        <div className="invoice-amount">
          {invoice.total?.toFixed(2)} TND
        </div>
      </div>

      <div className="invoice-date">
        {new Date(invoice.date).toLocaleDateString('fr-FR')}
      </div>
    </div>
  );
};


  const AlertItem = ({ alert, products }) => {
    const product = products?.find(p => p.id === alert.productId);
    return (
      <div className="alert-item">
        <div className="alert-icon">
          {alert.type === 'out_of_stock' ? '🛑' : '⚠️'}
        </div>
        <div className="alert-content">
          <div className="alert-message">{alert.message}</div>
          {product && (
            <div className="alert-product">{product.name}</div>
          )}
        </div>
        <div className="alert-time">
          {new Date(alert.createdAt).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    );
  };

  const TimeRangeSelector = () => (
    <div className="time-range-selector">
      <button
        className={`time-range-btn ${timeRange === 'today' ? 'active' : ''}`}
        onClick={() => setTimeRange('today')}
      >
        Aujourd'hui
      </button>
      <button
        className={`time-range-btn ${timeRange === 'week' ? 'active' : ''}`}
        onClick={() => setTimeRange('week')}
      >
        Cette semaine
      </button>
      <button
        className={`time-range-btn ${timeRange === 'month' ? 'active' : ''}`}
        onClick={() => setTimeRange('month')}
      >
        Ce mois
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Tableau de Bord</h1>
          <p>Aperçu de votre activité en temps réel</p>
        </div>
        <div className="header-actions">
          <TimeRangeSelector />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon="📦"
          title="Produits Totaux"
          value={stats.totalProducts || 0}
          color="#4CAF50"
          link="/products"
        />
        <StatCard
          icon="⚠️"
          title="Stock Faible"
          value={stats.lowStockCount || 0}
          color="#FF9800"
          link="/alerts"
        />
        <StatCard
          icon="🧾"
          title="Factures Du Mois"
          value={stats.totalInvoices || 0}
          color="#2196F3"
          link="/invoices"
        />
        <StatCard
          icon="💰"
          title="Chiffre d'Affaires"
          value={`${dashboardData.monthlyRevenue.toFixed(2)} TND`}
          color="#9C27B0"
          link="/invoices"
        />
        <StatCard
          icon="👥"
          title="Clients Actifs"
          value={stats.totalCustomers || 0}
          color="#00BCD4"
          link="/customers"
        />
        <StatCard
          icon="📈"
          title="Ventes Du Jour"
          value={dashboardData.dailySales}
          color="#FF5722"
          link="/invoices"
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* Left Column */}
        <div className="dashboard-column">
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Produits Récents</h2>
              <Link to="/products" className="view-all">
                Voir tout →
              </Link>
            </div>
            <div className="card-body">
              {dashboardData.recentProducts.map(product => (
                <ProductItem key={product.id} product={product} />
              ))}
              {dashboardData.recentProducts.length === 0 && (
                <div className="empty-state">
                  <p>Aucun produit récent</p>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <h2>Alertes Actives</h2>
              <Link to="/alerts" className="view-all">
                Voir tout →
              </Link>
            </div>
            <div className="card-body alerts-list">
              {dashboardData.recentAlerts.map(alert => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
              {dashboardData.recentAlerts.length === 0 && (
                <div className="empty-state">
                  <p>✅ Aucune alerte active</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-column">
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Factures Récents</h2>
              <Link to="/invoices" className="view-all">
                Voir tout →
              </Link>
            </div>
            <div className="card-body">
              {dashboardData.recentInvoices.map(invoice => (
                <InvoiceItem key={invoice.id} invoice={invoice} />
              ))}
              {dashboardData.recentInvoices.length === 0 && (
                <div className="empty-state">
                  <p>Aucune facture récente</p>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <h2>Produits en Stock Faible</h2>
              <Link to="/products" className="view-all">
                Voir tout →
              </Link>
            </div>
            <div className="card-body">
              {dashboardData.lowStockProducts.map(product => (
                <div key={product.id} className="low-stock-item">
                  <div className="product-details">
                    <div className="product-name">{product.name}</div>
                    <div className="product-ref">{product.reference}</div>
                  </div>
                  <div className="stock-info">
                    <div className="stock-level">
                      <span className="current-stock">{product.quantity_in_stock}</span>
                      <span className="stock-separator">/</span>
                      <span className="threshold">{product.threshold}</span>
                    </div>
                    <div className={`stock-status ${
                      product.quantity_in_stock <= 0 ? 'critical' : 'warning'
                    }`}>
                      {product.quantity_in_stock <= 0 ? 'RUPTURE' : 'FAIBLE'}
                    </div>
                  </div>
                </div>
              ))}
              {dashboardData.lowStockProducts.length === 0 && (
                <div className="empty-state">
                  <p>✅ Tous les stocks sont suffisants</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Actions Rapides</h2>
            </div>
            <div className="card-body quick-actions-grid">
              <Link to="/new-invoice" className="quick-action">
                <div className="action-icon">🧾</div>
                <div className="action-text">
                  <h3>Nouvelle Facture</h3>
                  <p>Créer une facture ou devis</p>
                </div>
              </Link>
              
              <Link to="/new-product" className="quick-action">
                <div className="action-icon">📦</div>
                <div className="action-text">
                  <h3>Ajouter Produit</h3>
                  <p>Ajouter un nouveau produit</p>
                </div>
              </Link>
              
              <Link to="/new-customer" className="quick-action">
                <div className="action-icon">👤</div>
                <div className="action-text">
                  <h3>Nouveau Client</h3>
                  <p>Ajouter un nouveau client</p>
                </div>
              </Link>
              
              <Link to="/alerts" className="quick-action">
                <div className="action-icon">⚠️</div>
                <div className="action-text">
                  <h3>Vérifier Alertes</h3>
                  <p>Voir les alertes de stock</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section (Placeholder for future charts) */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2>Statistiques de Ventes</h2>
          <div className="time-range-selector">
            <button className="time-range-btn active">30 jours</button>
            <button className="time-range-btn">90 jours</button>
            <button className="time-range-btn">Année</button>
          </div>
        </div>
        <div className="card-body">
          <div className="chart-placeholder">
            <div className="chart-message">
              📊 Les graphiques seront disponibles prochainement
            </div>
            <div className="chart-stats">
              <div className="chart-stat">
                <div className="stat-label">Ventes ce mois</div>
                <div className="stat-value">4,250 TND</div>
              </div>
              <div className="chart-stat">
                <div className="stat-label">Croissance</div>
                <div className="stat-value positive">+12.5%</div>
              </div>
              <div className="chart-stat">
                <div className="stat-label">Produits vendus</div>
                <div className="stat-value">156</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;