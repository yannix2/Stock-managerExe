// ViewProduct.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productApi } from '../api/stockApi';
import './ViewProduct.css';

const ViewProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const productData = await productApi.getById(id);
      setProduct(productData);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Produit non trouvé ou erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.')) {
      return;
    }

    try {
      await productApi.delete(id);
      alert('Produit supprimé avec succès');
      navigate('/products');
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Erreur lors de la suppression du produit');
    }
  };

  const getStockStatus = (quantity, threshold) => {
    if (quantity <= 0) return { text: 'Rupture de stock', class: 'danger', icon: '❌' };
    if (quantity <= threshold) return { text: 'Stock faible', class: 'warning', icon: '⚠️' };
    return { text: 'Stock suffisant', class: 'success', icon: '✅' };
  };

  const calculateProfitMargin = () => {
    if (!product.purchase_price || !product.selling_price) return 0;
    const profit = product.selling_price - product.purchase_price;
    const margin = (profit / product.purchase_price) * 100;
    return margin.toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement du produit...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="error-container">
        <div className="error-icon">📦</div>
        <h2>{error || 'Produit non trouvé'}</h2>
        <p>Le produit que vous recherchez n'existe pas ou a été supprimé.</p>
        <Link to="/products" className="btn-primary">
          ← Retour aux produits
        </Link>
      </div>
    );
  }

  const stockStatus = getStockStatus(product.quantity_in_stock, product.threshold);
  const profitMargin = calculateProfitMargin();

  return (
    <div className="product-view-container">
      {/* Header */}
      <div className="product-header">
        <button onClick={() => navigate('/products')} className="btn-back">
          ← Retour aux produits
        </button>
        <div className="header-actions">
          <Link 
            to={`/edit-product/${product.id}`}
            className="btn-primary"
          >
            ✏️ Modifier le produit
          </Link>
          <button 
            onClick={handleDelete}
            className="btn-danger"
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="product-content">
        {/* Product Title and Reference */}
        <div className="product-title-section">
          <div className="product-badge">
            <span className={`status-badge ${stockStatus.class}`}>
              {stockStatus.icon} {stockStatus.text}
            </span>
            <span className={`active-badge ${product.is_active ? 'active' : 'inactive'}`}>
              {product.is_active ? '🟢 Actif' : '🔴 Inactif'}
            </span>
          </div>
          <h1>{product.name}</h1>
          <div className="product-reference">
            <span className="ref-label">Référence:</span>
            <span className="ref-value">{product.reference}</span>
          </div>
        </div>

        {/* Product Info Cards */}
        <div className="info-grid">
          {/* Card 1: Informations Générales */}
          <div className="info-card">
            <div className="card-header">
              <span className="card-icon">📋</span>
              <h3>Informations Générales</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Catégorie:</span>
                <span className="info-value">{product.category || 'Non spécifié'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Marque:</span>
                <span className="info-value">{product.brand || 'Non spécifié'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Origine:</span>
                <span className="info-value">{product.origin || 'Non spécifié'}</span>
              </div>
              {product.compatible_references && (
                <div className="info-row">
                  <span className="info-label">Références compatibles:</span>
                  <span className="info-value">{product.compatible_references}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Stock & Prix */}
          <div className="info-card">
            <div className="card-header">
              <span className="card-icon">💰</span>
              <h3>Stock & Prix</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Stock actuel:</span>
                <span className={`info-value ${stockStatus.class}`}>
                  {product.quantity_in_stock} unités
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Seuil d'alerte:</span>
                <span className="info-value">{product.threshold} unités</span>
              </div>
              <div className="info-row">
                <span className="info-label">Prix d'achat:</span>
                <span className="info-value">{product.purchase_price?.toFixed(2) || '0.00'} TND</span>
              </div>
              <div className="info-row">
                <span className="info-label">Prix de vente:</span>
                <span className="info-value">{product.selling_price?.toFixed(2) || '0.00'} TND</span>
              </div>
              <div className="info-row">
                <span className="info-label">Marge bénéficiaire:</span>
                <span className={`info-value ${parseFloat(profitMargin) >= 0 ? 'profit' : 'loss'}`}>
                  {profitMargin}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Dates */}
          <div className="info-card">
            <div className="card-header">
              <span className="card-icon">📅</span>
              <h3>Dates</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Date de création:</span>
                <span className="info-value">
                  {new Date(product.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Dernière modification:</span>
                <span className="info-value">
                  {new Date(product.updatedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description Card */}
        {product.description && (
          <div className="description-card">
            <div className="card-header">
              <span className="card-icon">📝</span>
              <h3>Description</h3>
            </div>
            <div className="card-content">
              <p className="description-text">{product.description}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <button 
            onClick={() => navigate('/products')}
            className="btn-secondary"
          >
            ← Retour à la liste
          </button>
          <div className="action-group">
            <Link 
              to={`/edit-product/${product.id}`}
              className="btn-primary"
            >
              ✏️ Modifier
            </Link>
            <button 
              onClick={handleDelete}
              className="btn-danger"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProduct;