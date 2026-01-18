import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { invoiceApi, paymentApi } from '../api/stockApi';
import './InvoiceDetail.css';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchInvoiceData();
  }, [id]);

  const fetchInvoiceData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [invoiceData, paymentsData] = await Promise.all([
        invoiceApi.getById(id),
        paymentApi.getByInvoice(id)
      ]);
      
      if (!invoiceData) {
        setError('Facture non trouvée');
        return;
      }
      
      setInvoice(invoiceData);
      setPayments(paymentsData || []);
    } catch (err) {
      console.error('Error fetching invoice data:', err);
      setError('Erreur de chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    try {
      setIsProcessing(true);
      await invoiceApi.delete(id);
      alert('Facture supprimée avec succès');
      navigate('/invoices');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert('Erreur lors de la suppression');
      setShowDeleteModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      setIsProcessing(true);
      // API call to convert quote to invoice
      const updatedInvoice = await invoiceApi.update(id, { type: 'invoice', status: 'pending' });
      setInvoice(updatedInvoice);
      setShowConvertModal(false);
      alert('Devis converti en facture avec succès');
    } catch (err) {
      console.error('Error converting quote:', err);
      alert('Erreur lors de la conversion');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculatePaidAmount = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const calculateRemaining = () => {
    if (!invoice) return 0;
    return invoice.total - calculatePaidAmount();
  };

  const calculatePaymentProgress = () => {
    if (!invoice || invoice.total === 0) return 0;
    return (calculatePaidAmount() / invoice.total) * 100;
  };

  const getStatusLabel = (status) => {
    const labels = {
      paid: 'Payé',
      pending: 'En attente',
      cancelled: 'Annulé',
      nostatus: 'En attente'
    };
    return labels[status] || status;
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
  const getStatusColor = (status) => {
    const colors = {
      paid: '#28a745',
      pending: '#ffc107',
      cancelled: '#dc3545',
      nostatus: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  const getTypeLabel = (type) => {
    return type === 'invoice' ? 'Facture' : 'Devis';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
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

  const getMethodLabel = (method) => {
    const labels = {
      cash: 'Espèces',
      check: 'Chèque',
      card: 'Carte bancaire',
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

  const calculatePaymentStatus = () => {
    if (!invoice) return 'unknown';
    const remaining = calculateRemaining();
    if (remaining <= 0) return 'paid';
    if (calculatePaidAmount() > 0) return 'partially_paid';
    return 'pending';
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement de la facture...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="error-container">
        <div className="error-icon">🧾</div>
        <h2>{error || 'Facture non trouvée'}</h2>
        <p>La facture que vous recherchez n'existe pas ou a été supprimée.</p>
        <Link to="/invoices" className="btn-primary">
          ← Retour aux factures
        </Link>
      </div>
    );
  }

  const paidAmount = calculatePaidAmount();
  const remaining = calculateRemaining();
  const paymentProgress = calculatePaymentProgress();
  const paymentStatus = calculatePaymentStatus();

  return (
    <div className="invoice-detail-container">
      {/* Header */}
      <div className="invoice-header">
        <div className="header-left">
          <button onClick={() => navigate('/invoices')} className="btn-back">
            ← Retour
          </button>
          <div className="invoice-title">
            <h1>
              {getTypeLabel(invoice.type)} #{invoice.id}
              <span 
                className="status-badge" 
                style={{ backgroundColor: getStatusColor(invoice.status) }}
              >
                {getStatusLabel(invoice.status)}
              </span>
            </h1>
            <div className="invoice-meta">
              <span className="meta-item">📅 {formatDate(invoice.date)}</span>
              <span className="meta-item">👤 {invoice.Customer?.name || 'Client inconnu'}</span>
              {invoice.due_date && (
                <span className="meta-item">⏳ Échéance: {formatDate(invoice.due_date)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => downloadPDF(invoice.id)}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            📄 PDF
          </button>
          <Link to={`/customer-history/${invoice.customerId}`} className="btn-secondary">
            👤 Client
          </Link>
          {invoice.type === 'invoice' && remaining > 0 && (
            <Link to={`/payment/${id}`} className="btn-primary">
              💳 Payer
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{invoice.total?.toFixed(2)} TND</div>
            <div className="stat-label">Montant total</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{paidAmount.toFixed(2)} TND</div>
            <div className="stat-label">Payé</div>
            <div className="stat-percentage">{paymentProgress.toFixed(0)}%</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{remaining.toFixed(2)} TND</div>
            <div className="stat-label">Reste à payer</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{invoice.InvoiceItems?.length || 0}</div>
            <div className="stat-label">Articles</div>
          </div>
        </div>
      </div>

      {/* Payment Progress */}
      {invoice.type === 'invoice' && (
        <div className="payment-progress-section">
          <div className="progress-header">
            <h3>Progression du paiement</h3>
            <span className="progress-status">{getStatusLabel(paymentStatus)}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(paymentProgress, 100)}%` }}
            ></div>
          </div>
          <div className="progress-labels">
            <span>0 TND</span>
            <span>{paidAmount.toFixed(2)} TND</span>
            <span>{invoice.total?.toFixed(2)} TND</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            📋 Détails
          </button>
          <button
            className={`tab ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            🛒 Articles ({invoice.InvoiceItems?.length || 0})
          </button>
          {invoice.type === 'invoice' && (
            <button
              className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              💰 Paiements ({payments.length})
            </button>
          )}
          <button
            className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            📝 Notes
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'details' && (
            <div className="details-section">
              <div className="info-grid">
                <div className="info-card">
                  <h3>Informations client</h3>
                  <div className="info-content">
                    <div className="info-row">
                      <span className="info-label">Nom:</span>
                      <span className="info-value">{invoice.Customer?.name || 'Non spécifié'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Téléphone:</span>
                      <span className="info-value">{invoice.Customer?.phone || 'Non spécifié'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{invoice.Customer?.email || 'Non spécifié'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Adresse:</span>
                      <span className="info-value">{invoice.Customer?.address || 'Non spécifié'}</span>
                    </div>
                  </div>
                  <Link to={`/customer-history/${invoice.customerId}`} className="btn-text">
                    Voir profil client →
                  </Link>
                </div>

                <div className="info-card">
                  <h3>Informations facture</h3>
                  <div className="info-content">
                    <div className="info-row">
                      <span className="info-label">Type:</span>
                      <span className="info-value">{getTypeLabel(invoice.type)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Date:</span>
                      <span className="info-value">{formatDate(invoice.date)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Échéance:</span>
                      <span className="info-value">
                        {invoice.due_date ? formatDate(invoice.due_date) : 'Non spécifiée'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Statut:</span>
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(invoice.status) }}
                      >
                        {getStatusLabel(invoice.status)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Référence:</span>
                      <span className="info-value">{invoice.reference || 'Aucune'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="items-section">
              <div className="section-header">
                <h3>Articles ({invoice.InvoiceItems?.length || 0})</h3>
                <span className="total-items">
                  Total: {invoice.total?.toFixed(2)} TND
                </span>
              </div>
              
              {invoice.InvoiceItems && invoice.InvoiceItems.length > 0 ? (
                <div className="items-table-container">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Référence</th>
                        <th>Quantité</th>
                        <th>Prix unitaire</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.InvoiceItems.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>
                            <div className="product-info">
                              <span className="product-name">{item.Product?.name || 'Produit supprimé'}</span>
                              {item.Product?.category && (
                                <span className="product-category">{item.Product.category}</span>
                              )}
                            </div>
                          </td>
                          <td>{item.Product?.reference || '-'}</td>
                          <td>
                            <span className="quantity">{item.quantity}</span>
                          </td>
                          <td>{item.unit_price?.toFixed(2)} TND</td>
                          <td>
                            <strong className="item-total">
                              {(item.quantity * item.unit_price)?.toFixed(2)} TND
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4" className="text-right">
                          <strong>Total HT:</strong>
                        </td>
                        <td>
                          <strong>{(invoice.total / 1.19)?.toFixed(2)} TND</strong>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="4" className="text-right">
                          <strong>TVA 19%:</strong>
                        </td>
                        <td>
                          <strong>{(invoice.total * 0.19)?.toFixed(2)} TND</strong>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="4" className="text-right">
                          <strong>Total TTC:</strong>
                        </td>
                        <td>
                          <strong className="total-amount">{invoice.total?.toFixed(2)} TND</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🛒</div>
                  <p>Aucun article dans cette facture</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && invoice.type === 'invoice' && (
            <div className="payments-section">
              <div className="section-header">
                <h3>Historique des paiements</h3>
                <div className="payment-summary">
                  <span className="summary-item">
                    Total payé: <strong>{paidAmount.toFixed(2)} TND</strong>
                  </span>
                  <span className="summary-item">
                    Reste: <strong className="remaining">{remaining.toFixed(2)} TND</strong>
                  </span>
                </div>
              </div>

              {payments.length > 0 ? (
                <div className="payments-list">
                  {payments.map((payment, index) => (
                    <div key={payment.id || index} className="payment-card">
                      <div className="payment-header">
                        <div className="payment-method">
                          <span className="method-icon">{getMethodIcon(payment.method)}</span>
                          <span className="method-label">{getMethodLabel(payment.method)}</span>
                        </div>
                        <div className="payment-amount">{payment.amount.toFixed(2)} TND</div>
                      </div>
                      <div className="payment-details">
                        <div className="payment-date">
                          <span className="date-icon">📅</span>
                          {formatDateTime(payment.payment_date || payment.createdAt)}
                        </div>
                        {payment.notes && (
                          <div className="payment-notes">
                            <span className="notes-icon">📝</span>
                            {payment.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">💰</div>
                  <p>Aucun paiement enregistré</p>
                  {remaining > 0 && (
                    <Link to={`/invoices/${id}/payment`} className="btn-primary">
                      Ajouter un paiement
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-section">
              <div className="notes-card">
                <h3>Notes</h3>
                {invoice.notes ? (
                  <div className="notes-content">
                    <p>{invoice.notes}</p>
                  </div>
                ) : (
                  <div className="empty-notes">
                    <span className="notes-icon">📝</span>
                    <p>Aucune note pour cette facture</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="footer-actions">
        <div className="action-group">
          <Link to={`/invoices/${id}/edit`} className="btn-secondary">
            ✏️ Modifier
          </Link>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger"
          >
            🗑️ Supprimer
          </button>
        </div>
        <div className="action-group">
          <button 
            onClick={() => downloadPDF(invoice.id)}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary"
          >
            📄 Imprimer PDF
          </button>
          <Link to={`/payment/${id}`} className="btn-primary" disabled={invoice.type !== 'invoice' || remaining <= 0}>
            💳 Gérer les paiements
          </Link>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="modal-header">
              <h3>Confirmer la suppression</h3>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="close-btn"
                disabled={isProcessing}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Êtes-vous sûr de vouloir supprimer cette {getTypeLabel(invoice.type).toLowerCase()} ?</p>
              <p className="warning-text">Cette action est irréversible.</p>
              
              <div className="invoice-details">
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{getTypeLabel(invoice.type)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Montant:</span>
                  <span className="detail-value">{invoice.total?.toFixed(2)} TND</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Client:</span>
                  <span className="detail-value">{invoice.Customer?.name || 'Client inconnu'}</span>
                </div>
                {payments.length > 0 && (
                  <div className="detail-row warning">
                    <span className="detail-label">⚠️ Attention:</span>
                    <span className="detail-value">
                      {payments.length} paiement(s) seront également supprimés
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
                disabled={isProcessing}
              >
                Annuler
              </button>
              <button 
                onClick={handleDeleteInvoice}
                className="btn-danger"
                disabled={isProcessing}
              >
                {isProcessing ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvertModal && invoice.type === 'quote' && (
        <div className="modal-overlay">
          <div className="modal convert-modal">
            <div className="modal-header">
              <h3>Convertir le devis en facture</h3>
              <button 
                onClick={() => setShowConvertModal(false)}
                className="close-btn"
                disabled={isProcessing}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="success-icon">✅</div>
              <p>Convertir ce devis en facture ?</p>
              <div className="invoice-details">
                <div className="detail-row">
                  <span className="detail-label">Devis #:</span>
                  <span className="detail-value">{invoice.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Montant:</span>
                  <span className="detail-value">{invoice.total?.toFixed(2)} TND</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Client:</span>
                  <span className="detail-value">{invoice.Customer?.name || 'Client inconnu'}</span>
                </div>
                <div className="detail-row info">
                  <span className="detail-label">📝 Note:</span>
                  <span className="detail-value">
                    La conversion créera une facture avec le statut "En attente"
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowConvertModal(false)}
                className="btn-secondary"
                disabled={isProcessing}
              >
                Annuler
              </button>
              <button 
                onClick={handleConvertToInvoice}
                className="btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? 'Conversion...' : 'Convertir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetail;