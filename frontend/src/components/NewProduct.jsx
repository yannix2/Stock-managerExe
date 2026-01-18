import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../api/stockApi';
import './NewProduct.css';

const NewProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    category: '',
    brand: '',
    origin: '',
    compatible_references: '',
    description: '',
    quantity_in_stock: 0,
    threshold: 5,
    purchase_price: 0,
    selling_price: 0,
    is_active: true
  });

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const product = await productApi.getById(id);
      if (product) {
        setFormData({
          name: product.name || '',
          reference: product.reference || '',
          category: product.category || '',
          brand: product.brand || '',
          origin: product.origin || '',
          compatible_references: product.compatible_references || '',
          description: product.description || '',
          quantity_in_stock: product.quantity_in_stock || 0,
          threshold: product.threshold || 5,
          purchase_price: product.purchase_price || 0,
          selling_price: product.selling_price || 0,
          is_active: product.is_active !== false
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Erreur de chargement du produit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? checked 
        : (name.includes('price') || name.includes('quantity') || name.includes('threshold') 
          ? parseFloat(value) || 0 
          : value)
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Le nom du produit est obligatoire');
      return false;
    }

    if (!formData.reference.trim()) {
      setError('La référence du produit est obligatoire');
      return false;
    }

    if (formData.threshold < 1) {
      setError('Le seuil d\'alerte doit être au moins de 1');
      return false;
    }

    if (formData.quantity_in_stock < 0) {
      setError('La quantité en stock ne peut pas être négative');
      return false;
    }

    if (formData.purchase_price < 0 || formData.selling_price < 0) {
      setError('Les prix ne peuvent pas être négatifs');
      return false;
    }

    if (formData.selling_price > 0 && formData.purchase_price > 0 && 
        formData.selling_price < formData.purchase_price) {
      setError('Le prix de vente ne peut pas être inférieur au prix d\'achat');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (isEditMode) {
        await productApi.update(id, formData);
        setSuccess('Produit mis à jour avec succès!');
      } else {
        await productApi.create(formData);
        setSuccess('Produit créé avec succès!');
      }

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/products');
      }, 2000);

    } catch (error) {
      console.error('Error saving product:', error);
      setError(error.message || 'Erreur lors de la sauvegarde du produit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Les modifications non sauvegardées seront perdues. Continuer?')) {
      navigate('/products');
    }
  };

  const handleQuickThreshold = (threshold) => {
    setFormData(prev => ({ ...prev, threshold }));
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement du produit...</p>
      </div>
    );
  }

  return (
    <div className="new-product-container">
      <div className="page-header">
        <h1>{isEditMode ? 'Modifier le Produit' : 'Nouveau Produit'}</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/products')} className="btn-secondary">
            ← Retour aux produits
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-sections">
          {/* Left Column - Basic Info */}
          <div className="form-column">
            <div className="form-section">
              <h3>Informations de Base</h3>
              
              <div className="form-group">
                <label>Nom du produit *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Nom complet du produit"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>Référence *</label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  required
                  placeholder="REF-001"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Catégorie</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Electronique, Automobile..."
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label>Marque</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="Marque du produit"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Origine</label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  placeholder="Pays d'origine"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>Références compatibles</label>
                <input
                  type="text"
                  name="compatible_references"
                  value={formData.compatible_references}
                  onChange={handleChange}
                  placeholder="REF-002, REF-003..."
                  disabled={isSubmitting}
                />
                <small>Séparez les références par des virgules</small>
              </div>
            </div>

            <div className="form-section">
              <h3>Description</h3>
              <div className="form-group">
                <label>Description détaillée</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="6"
                  placeholder="Description complète du produit, spécifications techniques..."
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Stock & Pricing */}
          <div className="form-column">
            <div className="form-section">
              <h3>Gestion du Stock</h3>
              
              <div className="form-group">
                <label>Quantité en stock</label>
                <div className="quantity-input-group">
                  <input
                    type="number"
                    name="quantity_in_stock"
                    value={formData.quantity_in_stock}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    disabled={isSubmitting}
                  />
                  <span className="input-suffix">unités</span>
                </div>
              </div>

              <div className="form-group">
                <label>Seuil d'alerte *</label>
                <div className="threshold-group">
                  <div className="threshold-input">
                    <div className="quantity-input-group">
                      <input
                        type="number"
                        name="threshold"
                        value={formData.threshold}
                        onChange={handleChange}
                        min="1"
                        step="1"
                        required
                        disabled={isSubmitting}
                      />
                      <span className="input-suffix">unités</span>
                    </div>
                    <small>Alert quand stock ≤ ce nombre</small>
                  </div>
                  
                  <div className="quick-thresholds">
                    <span>Préréglages:</span>
                    <div className="threshold-buttons">
                      <button type="button" onClick={() => handleQuickThreshold(1)}>1</button>
                      <button type="button" onClick={() => handleQuickThreshold(5)}>5</button>
                      <button type="button" onClick={() => handleQuickThreshold(10)}>10</button>
                      <button type="button" onClick={() => handleQuickThreshold(20)}>20</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="stock-status">
                <h4>État du stock:</h4>
                <div className={`status-indicator ${
                  formData.quantity_in_stock <= 0 ? 'out-of-stock' :
                  formData.quantity_in_stock <= formData.threshold ? 'low-stock' : 'in-stock'
                }`}>
                  {formData.quantity_in_stock <= 0 ? (
                    <>
                      <span className="status-icon">🛑</span>
                      <span className="status-text">RUPTURE DE STOCK</span>
                    </>
                  ) : formData.quantity_in_stock <= formData.threshold ? (
                    <>
                      <span className="status-icon">⚠️</span>
                      <span className="status-text">STOCK FAIBLE</span>
                      <span className="status-detail">
                        ({formData.quantity_in_stock} restant, seuil: {formData.threshold})
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="status-icon">✅</span>
                      <span className="status-text">STOCK SUFFISANT</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Prix</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Prix d'achat (TND)</label>
                  <div className="price-input-group">
                    <input
                      type="number"
                      name="purchase_price"
                      value={formData.purchase_price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      disabled={isSubmitting}
                    />
                    <span className="input-suffix">TND</span>
                  </div>
                  <small>Coût d'acquisition</small>
                </div>

                <div className="form-group">
                  <label>Prix de vente (TND)</label>
                  <div className="price-input-group">
                    <input
                      type="number"
                      name="selling_price"
                      value={formData.selling_price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      disabled={isSubmitting}
                    />
                    <span className="input-suffix">TND</span>
                  </div>
                  <small>Prix client final</small>
                </div>
              </div>

              {formData.purchase_price > 0 && formData.selling_price > 0 && (
                <div className="margin-calculation">
                  <h4>Calcul de marge:</h4>
                  <div className="margin-grid">
                    <div className="margin-item">
                      <span>Marge brute:</span>
                      <span className="margin-value">
                        {formData.selling_price - formData.purchase_price} TND
                      </span>
                    </div>
                    <div className="margin-item">
                      <span>Marge %:</span>
                      <span className={`margin-value ${
                        ((formData.selling_price - formData.purchase_price) / formData.purchase_price * 100) >= 0 
                          ? 'positive' 
                          : 'negative'
                      }`}>
                        {formData.purchase_price > 0 
                          ? `${((formData.selling_price - formData.purchase_price) / formData.purchase_price * 100).toFixed(1)}%`
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="margin-item">
                      <span>Valeur stock:</span>
                      <span className="margin-value">
                        {(formData.quantity_in_stock * formData.purchase_price).toFixed(2)} TND
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-section">
              <h3>Status</h3>
              <div className="status-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-text">
                    {formData.is_active ? 'Produit actif' : 'Produit inactif'}
                  </span>
                </label>
                <small className="toggle-description">
                  Les produits inactifs n'apparaîtront pas dans les listes de vente
                </small>
              </div>
            </div>

            {/* Preview Section */}
            <div className="form-section preview-section">
              <h3>Prévisualisation</h3>
              <div className="preview-card">
                <div className="preview-header">
                  <h4>{formData.name || 'Nom du produit'}</h4>
                  <span className="preview-ref">{formData.reference || 'REF-001'}</span>
                </div>
                <div className="preview-content">
                  <div className="preview-row">
                    <span>Catégorie:</span>
                    <strong>{formData.category || 'Non spécifié'}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Marque:</span>
                    <strong>{formData.brand || 'Non spécifié'}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Stock:</span>
                    <strong className={
                      formData.quantity_in_stock <= 0 ? 'out-of-stock' :
                      formData.quantity_in_stock <= formData.threshold ? 'low-stock' :
                      'in-stock'
                    }>
                      {formData.quantity_in_stock} unités
                    </strong>
                  </div>
                  <div className="preview-row">
                    <span>Seuil:</span>
                    <strong>{formData.threshold} unités</strong>
                  </div>
                  {formData.selling_price > 0 && (
                    <div className="preview-row">
                      <span>Prix:</span>
                      <strong className="price">{formData.selling_price.toFixed(2)} TND</strong>
                    </div>
                  )}
                  {formData.compatible_references && (
                    <div className="preview-row">
                      <span>Compatibilité:</span>
                      <small>{formData.compatible_references}</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-small"></span>
                {isEditMode ? 'Mise à jour...' : 'Création...'}
              </>
            ) : (
              isEditMode ? 'Mettre à jour le produit' : 'Créer le produit'
            )}
          </button>
        </div>
      </form>

      <div className="form-tips">
        <h4>💡 Conseils pour les produits:</h4>
        <ul>
          <li>Utilisez une référence unique pour chaque produit</li>
          <li>Définissez un seuil d'alerte réaliste pour éviter les ruptures</li>
          <li>Maintenez les prix à jour pour des marges précises</li>
          <li>Renseignez les références compatibles pour aider à la recherche</li>
          <li>Une description détaillée aide à identifier le produit</li>
        </ul>
      </div>
    </div>
  );
};

export default NewProduct;