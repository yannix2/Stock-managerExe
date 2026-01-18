import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Customers from './components/Customers';
import Invoices from './components/Invoices';
import Alerts from './components/Alerts';
import NewInvoice from './components/NewInvoice';
import NewProduct from './components/NewProduct';
import ViewProduct from './components/ViewProduct';
import NewCustomer from './components/NewCustomer';
import PaymentPage from './components/PaymentPage';
import PaymentsHistory from './components/PaymentsHistory';
import CustomerHistory from './components/CustomerHistory';
import logoImage from'./assets/test.png';
import InvoiceDetail from './components/InvoiceDetail';
import Login from './components/Login';
import Register from './components/Register';
import Logout from './components/Logout';
import { productApi, invoiceApi, alertApi, customerApi } from './api/stockApi';
import { authApi } from './api/stockApi';
import './App.css';

// Navigation Component
const Navigation = () => {
  const location = useLocation();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchLowStockCount();
    const user = authApi.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const fetchLowStockCount = async () => {
    try {
      const data = await alertApi.getUnresolved();
      setLowStockCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching low stock:', error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sidebar">
      <div className="logo">
        <img src={logoImage} alt="STE ESPOIR Logo" className="logo-image" />
      </div>

      <ul className="nav-menu">
        <li>
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            <span className="icon">📊</span>
            <span>Dashboard</span>
          </Link>
        </li>
        <li>
          <Link to="/products" className={isActive('/products') ? 'active' : ''}>
            <span className="icon">📦</span>
            <span>Produits</span>
          </Link>
        </li>
        <li>
          <Link to="/customers" className={isActive('/customers') ? 'active' : ''}>
            <span className="icon">👥</span>
            <span>Clients</span>
          </Link>
        </li>
        <li>
          <Link to="/invoices" className={isActive('/invoices') ? 'active' : ''}>
            <span className="icon">🧾</span>
            <span>Factures</span>
          </Link>
        </li>
        <li>
          <Link to="/alerts" className={isActive('/alerts') ? 'active' : ''}>
            <span className="icon">⚠️</span>
            <span>Alertes</span>
            {lowStockCount > 0 && <span className="badge">{lowStockCount}</span>}
          </Link>
        </li>
        <li>
          <Link to="/payments" className={isActive('/payments') ? 'active' : ''}>
            <span className="icon">💵</span>
            <span>Paiements</span>
          </Link>
        </li>

        <li className="divider">Actions Rapides</li>
        <li>
          <Link to="/new-invoice" className="btn-action btn-primary">
            <span className="icon">➕</span>
            <span>Nouvelle Facture</span>
          </Link>
        </li>
        <li>
          <Link to="/new-product" className="btn-action btn-secondary">
            <span className="icon">➕</span>
            <span>Nouveau Produit</span>
          </Link>
        </li>
        <li>
          <Link to="/new-customer" className="btn-action btn-tertiary">
            <span className="icon">➕</span>
            <span>Nouveau Client</span>
          </Link>
        </li>
      </ul>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">👤</div>
          <div className="user-details">
            <strong>{currentUser?.username || 'Utilisateur'}</strong>
            <small>Connecté</small>
          </div>
        </div>
        <Link to="/logout" className="logout-btn">
          <span className="icon">🚪</span>
          <span>Déconnexion</span>
        </Link>
      </div>
    </nav>
  );
};

// Top Bar Component
const TopBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    const user = authApi.getCurrentUser();
    setCurrentUser(user);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) =>
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) =>
    date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="date-time">
          <div className="time">{formatTime(currentTime)}</div>
          <div className="date">{formatDate(currentTime)}</div>
        </div>
      </div>

      <div className="topbar-right">
        <div className="user-profile">
          <div className="profile-info">
            <span className="username">{currentUser?.username || 'Invité'}</span>
            <span className="user-role">Administrateur</span>
          </div>
          <div className="avatar-sm">👤</div>
        </div>
      </div>
    </header>
  );
};

// Main App Content (Protected Layout)
const ProtectedLayout = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    activeAlerts: 0,
    totalInvoices: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const [products, lowStockData, invoices, customers, alerts] = await Promise.all([
        productApi.getAll(),
        productApi.getLowStock(),
        invoiceApi.getAll(),
        customerApi.getAll(),
        alertApi.getAll(),
      ]);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.date || inv.createdAt);
        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      });
      const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      setStats({
        totalProducts: products?.length || 0,
        lowStockCount: lowStockData?.count || 0,
        activeAlerts: alerts?.filter((a) => !a.resolved)?.length || 0,
        totalInvoices: invoices?.length || 0,
        totalCustomers: customers?.length || 0,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navigation />

      <main className="main-content">
        <TopBar />

        <div className="content-wrapper">
          <div className="content-area">
            <Routes>
              <Route path="/dashboard" element={<Dashboard stats={stats} onRefresh={handleRefresh} />} />
              <Route path="/products" element={<Products />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/new-invoice" element={<NewInvoice />} />
              <Route path="/new-product" element={<NewProduct />} />
              <Route path="/new-customer" element={<NewCustomer />} />
              <Route path="/edit-product/:id" element={<NewProduct />} />
              <Route path="/edit-customer/:id" element={<NewCustomer />} />
              <Route path="/view-product/:id" element={<ViewProduct />} />
              <Route path="/payment/:id" element={<PaymentPage />} />
              <Route path="/payments" element={<PaymentsHistory />} />
              <Route path="/customer-history/:id" element={<CustomerHistory />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/invoices/:id/edit" element={<InvoiceDetail />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

// Main App Component
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(authApi.isAuthenticated());

  useEffect(() => {
    const checkAuth = () => setIsAuthenticated(authApi.isAuthenticated());
    window.addEventListener('storage', checkAuth);
    checkAuth();
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <div className="app">
      <Routes>
        {!isAuthenticated && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
        {isAuthenticated && <Route path="/*" element={<ProtectedLayout />} />}
        <Route path="/logout" element={<Logout />} />
      </Routes>
    </div>
  );
};

export default App;
