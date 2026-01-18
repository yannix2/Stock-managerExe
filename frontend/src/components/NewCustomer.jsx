import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerApi } from '../api/stockApi';
import './NewCustomer.css';

const NewCustomer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    is_active: true
  });

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setIsLoading(true);
      const customer = await customerApi.getById(id);
      if (customer) {
        setFormData({
          name: customer.name || '',
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.address || '',
          is_active: customer.is_active !== false
        });
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Erreur de chargement du client');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Le nom du client est obligatoire');
      return false;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Format d\'email invalide');
      return false;
    }

    if (formData.phone && !/^[\d\s\+\-\(\)]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      setError('Format de téléphone invalide');
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
        await customerApi.update(id, formData);
        setSuccess('Client mis à jour avec succès!');
      } else {
        await customerApi.create(formData);
        setSuccess('Client créé avec succès!');
      }

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/customers');
      }, 2000);

    } catch (error) {
      console.error('Error saving customer:', error);
      setError(error.message || 'Erreur lors de la sauvegarde du client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Les modifications non sauvegardées seront perdues. Continuer?')) {
      navigate('/customers');
    }
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement du client...</p>
      </div>
    );
  }

  return (
    <div className="new-customer-container">
      <div className="page-header">
        <h1>{isEditMode ? 'Modifier le Client' : 'Nouveau Client'}</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/customers')} className="btn-secondary">
            ← Retour aux clients
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="customer-form">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-sections">
          {/* Left Column - Basic Info */}
          <div className="form-column">
            <div className="form-section">
              <h3>Informations de Base</h3>
              
              <div className="form-group">
                <label>Nom complet *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Nom et prénom"
                  disabled={isSubmitting}
                />
                <small>Le nom du client tel qu'il apparaîtra sur les factures</small>
              </div>

              <div className="form-group">
                <label>Adresse email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="client@exemple.com"
                  disabled={isSubmitting}
                />
                <small>Utilisé pour l'envoi des factures et communications</small>
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+216 22 222 222"
                  disabled={isSubmitting}
                />
                <small>Format international recommandé</small>
              </div>
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
                    {formData.is_active ? 'Client actif' : 'Client inactif'}
                  </span>
                </label>
                <small className="toggle-description">
                  Les clients inactifs n'apparaîtront pas dans les listes de sélection
                </small>
              </div>
            </div>
          </div>

          {/* Right Column - Address & Preview */}
          <div className="form-column">
            <div className="form-section">
              <h3>Adresse</h3>
              
              <div className="form-group">
                <label>Adresse complète</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="6"
                  placeholder="Numéro, rue
Code postal, Ville
Pays"
                  disabled={isSubmitting}
                />
                <small>Saisissez l'adresse sur plusieurs lignes</small>
              </div>
            </div>

            <div className="form-section">
              <h3>Prévisualisation</h3>
              <div className="preview-card">
                <div className="preview-header">
                  <h4>Fiche Client</h4>
                  <span className="preview-status">
                    {formData.is_active ? '✅ Actif' : '⏸️ Inactif'}
                  </span>
                </div>
                
                <div className="preview-content">
                  <div className="preview-field">
                    <span className="field-label">Nom:</span>
                    <span className="field-value">{formData.name || 'Non spécifié'}</span>
                  </div>
                  
                  <div className="preview-field">
                    <span className="field-label">Email:</span>
                    <span className="field-value">
                      {formData.email ? (
                        <a href={`mailto:${formData.email}`} className="email-link">
                          {formData.email}
                        </a>
                      ) : (
                        'Non spécifié'
                      )}
                    </span>
                  </div>
                  
                  <div className="preview-field">
                    <span className="field-label">Téléphone:</span>
                    <span className="field-value">
                      {formData.phone ? (
                        <a href={`tel:${formData.phone}`} className="phone-link">
                          {formData.phone}
                        </a>
                      ) : (
                        'Non spécifié'
                      )}
                    </span>
                  </div>
                  
                  <div className="preview-field">
                    <span className="field-label">Adresse:</span>
                    <span className="field-value address-preview">
                      {formData.address ? (
                        formData.address.split('\n').map((line, index) => (
                          <React.Fragment key={index}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))
                      ) : (
                        'Non spécifiée'
                      )}
                    </span>
                  </div>
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
              isEditMode ? 'Mettre à jour le client' : 'Créer le client'
            )}
          </button>
        </div>
      </form>

      <div className="form-tips">
        <h4>💡 Conseils pour les clients:</h4>
        <ul>
          <li>Renseignez toujours le nom complet pour une identification facile</li>
          <li>L'email est nécessaire pour l'envoi automatique des factures</li>
          <li>Gardez les numéros de téléphone à jour pour les urgences</li>
          <li>Une adresse complète est requise pour les factures légales</li>
          <li>Désactivez les clients qui ne sont plus actifs</li>
        </ul>
      </div>
    </div>
  );
};

export default NewCustomer;