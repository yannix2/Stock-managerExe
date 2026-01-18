import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invoiceApi, paymentApi } from '../api/stockApi';
import './PaymentPage.css';

const PaymentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash',
    notes: ''
  });

  useEffect(() => {
    fetchInvoiceAndPayments();
  }, [id]);

  const fetchInvoiceAndPayments = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      console.log('Fetching invoice with ID:', id);
      
      // First, try to get the invoice
      const invoiceData = await invoiceApi.getById(id);
      console.log('Invoice data received:', invoiceData);
      
      if (!invoiceData) {
        setApiError('Facture non trouvée dans la base de données');
        setIsLoading(false);
        return;
      }
      
      setInvoice(invoiceData);
      
      // Then try to get payments
      try {
        const paymentsData = await paymentApi.getByInvoice(id);
        console.log('Payments data received:', paymentsData);
        setPayments(paymentsData || []);
      } catch (paymentError) {
        console.warn('No payments found or error fetching payments:', paymentError);
        setPayments([]);
      }
      
      // Calculate total paid and set default payment amount
      const totalPaid = (payments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const remaining = invoiceData.total - totalPaid;
      setPaymentData(prev => ({
        ...prev,
        amount: remaining > 0 ? remaining.toFixed(2) : ''
      }));
      
    } catch (err) {
      console.error('Error fetching invoice:', err);
      console.error('Error details:', err.message, err.response);
      
      if (err.response?.status === 404) {
        setApiError(`Facture avec l'ID ${id} introuvable`);
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setApiError('Vous n\'êtes pas autorisé à voir cette facture');
      } else {
        setApiError('Erreur de connexion au serveur. Vérifiez votre connexion internet.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add a retry function
  const handleRetry = () => {
    fetchInvoiceAndPayments();
  };

  const calculateTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const calculateRemaining = () => {
    if (!invoice) return 0;
    return invoice.total - calculateTotalPaid();
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || '' : value
    }));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    const remaining = calculateRemaining();
    if (paymentData.amount > remaining) {
      setError(`Le montant ne peut pas dépasser le reste dû (${remaining.toFixed(2)} TND)`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payment = await paymentApi.create({
        invoiceId: parseInt(id),
        amount: parseFloat(paymentData.amount),
        method: paymentData.method,
        notes: paymentData.notes
      });

      console.log('Payment created:', payment);
      
      // Refresh data
      await fetchInvoiceAndPayments();
      
      // Reset form with new remaining amount
      const newRemaining = calculateRemaining();
      setPaymentData({
        amount: newRemaining > 0 ? newRemaining.toFixed(2) : '',
        method: 'cash',
        notes: ''
      });

      alert(`Paiement de ${payment.amount} TND enregistré avec succès!`);
      
      // If fully paid, ask if user wants to go back
      if (newRemaining <= 0) {
        if (window.confirm('Facture entièrement payée ! Voulez-vous retourner à la liste des factures ?')) {
          navigate('/invoices');
        }
      }
    } catch (err) {
      console.error('Error creating payment:', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
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

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement de la facture...</p>
        <p className="loading-details">ID: {id}</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="error-container">
        <div className="error-icon">🔍</div>
        <h2>Erreur de chargement</h2>
        <p>{apiError}</p>
        <div className="debug-info">
          <p><small>ID recherché: {id}</small></p>
        </div>
        <div className="action-buttons">
          <button onClick={handleRetry} className="btn-primary">
            🔄 Réessayer
          </button>
          <Link to="/invoices" className="btn-secondary">
            ← Retour aux factures
          </Link>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="error-container">
        <div className="error-icon">🧾</div>
        <h2>Facture introuvable</h2>
        <p>Aucune donnée de facture disponible pour l'ID: {id}</p>
        <div className="debug-info">
          <p><small>ID: {id}</small></p>
          <p><small>Assurez-vous que cette facture existe dans le système</small></p>
        </div>
        <div className="action-buttons">
          <button onClick={handleRetry} className="btn-primary">
            🔄 Réessayer le chargement
          </button>
          <Link to="/invoices" className="btn-secondary">
            ← Retour aux factures
          </Link>
        </div>
      </div>
    );
  }

  if (invoice.type !== 'invoice') {
    return (
      <div className="error-container">
        <div className="error-icon">📋</div>
        <h2>Paiement non autorisé</h2>
        <p>Les paiements ne sont autorisés que pour les factures, pas pour les devis.</p>
        <p className="document-info">
          Ce document est un <strong>{invoice.type === 'quote' ? 'Devis' : 'Document'}</strong>.
        </p>
        <div className="action-buttons">
          <Link to={`/invoices/${id}`} className="btn-primary">
            👁️ Voir le document
          </Link>
          <Link to="/invoices" className="btn-secondary">
            ← Retour aux factures
          </Link>
        </div>
      </div>
    );
  }

  if (invoice.status === 'paid') {
    return (
      <div className="error-container">
        <div className="error-icon">✅</div>
        <h2>Facture déjà payée</h2>
        <p>Cette facture a déjà été entièrement payée.</p>
        <div className="invoice-details">
          <p><strong>Montant total:</strong> {invoice.total?.toFixed(2)} TND</p>
          <p><strong>Référence:</strong> {invoice.reference || invoice.id}</p>
        </div>
        <div className="action-buttons">
          <Link to={`/invoices/${id}`} className="btn-primary">
            👁️ Voir la facture
          </Link>
          <Link to="/payments" className="btn-secondary">
            📊 Voir l'historique des paiements
          </Link>
        </div>
      </div>
    );
  }

  const totalPaid = calculateTotalPaid();
  const remaining = calculateRemaining();
  const paymentPercentage = (totalPaid / invoice.total) * 100;

  return (
    <div className="payment-container">
      {/* Header */}
      <div className="payment-header">
        <div className="header-left">
          <button onClick={() => navigate(`/invoices/${id}`)} className="btn-back">
            ← Retour à la facture
          </button>
          <div className="header-title">
            <h1>Enregistrer un paiement</h1>
            <div className="invoice-details-header">
              <span className="invoice-ref">Facture #{invoice.reference || invoice.id}</span>
              <span className="customer-name">{invoice.customer?.name || 'Client'}</span>
              {invoice.customer?.phone && (
                <span className="customer-phone">📞 {invoice.customer.phone}</span>
              )}
            </div>
          </div>
        </div>
        <div className="header-right">
          <button onClick={fetchInvoiceAndPayments} className="btn-refresh">
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="payment-summary">
        <div className="summary-card total">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-label">Total de la facture</div>
            <div className="summary-amount">{invoice.total?.toFixed(2)} TND</div>
            <div className="summary-date">
              Date: {new Date(invoice.date).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>
        
        <div className="summary-card paid">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <div className="summary-label">Déjà payé</div>
            <div className="summary-amount">{totalPaid.toFixed(2)} TND</div>
            <div className="summary-percentage">
              <div className="percentage-circle">
                {paymentPercentage.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
        
        <div className="summary-card remaining">
          <div className="summary-icon">⏳</div>
          <div className="summary-content">
            <div className="summary-label">Reste à payer</div>
            <div className="summary-amount">{remaining.toFixed(2)} TND</div>
            <div className="summary-status">
              {remaining > 0 ? 'En attente' : 'Payé'}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="progress-labels">
          <span>0 TND</span>
          <span>{totalPaid.toFixed(2)} TND</span>
          <span>{invoice.total?.toFixed(2)} TND</span>
        </div>
      </div>

      <div className="payment-content">
        {/* Left Column: Payment Form */}
        <div className="payment-form-section">
          <div className="section-card">
            <div className="section-header">
              <h2>📝 Nouveau paiement</h2>
              {payments.length === 0 && (
                <div className="first-payment-badge">
                  Premier paiement pour cette facture
                </div>
              )}
            </div>
            
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="payment-form">
              <div className="form-group">
                <label>
                  Montant à payer (TND)
                  <span className="hint">Maximum: {remaining.toFixed(2)} TND</span>
                </label>
                <div className="amount-input-group">
                  <div className="amount-input-wrapper">
                    <input
                      type="number"
                      name="amount"
                      value={paymentData.amount}
                      onChange={handlePaymentChange}
                      placeholder="0.00"
                      min="0.01"
                      max={remaining}
                      step="0.01"
                      required
                      className="amount-input"
                      autoFocus
                    />
                    <span className="currency-symbol">TND</span>
                  </div>
                  <div className="amount-suggestions">
                    <button
                      type="button"
                      onClick={() => setPaymentData(prev => ({ 
                        ...prev, 
                        amount: parseFloat(remaining.toFixed(2))
                      }))}
                      className="amount-suggestion full"
                    >
                      💰 Tout payer ({remaining.toFixed(2)} TND)
                    </button>
                    {remaining > 100 && (
                      <button
                        type="button"
                        onClick={() => setPaymentData(prev => ({ ...prev, amount: 100 }))}
                        className="amount-suggestion"
                      >
                        100 TND
                      </button>
                    )}
                    {remaining > 50 && (
                      <button
                        type="button"
                        onClick={() => setPaymentData(prev => ({ ...prev, amount: 50 }))}
                        className="amount-suggestion"
                      >
                        50 TND
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Méthode de paiement</label>
                <div className="payment-methods">
                  {['cash', 'check', 'card', 'transfer', 'other'].map(method => (
                    <label key={method} className="method-option">
                      <input
                        type="radio"
                        name="method"
                        value={method}
                        checked={paymentData.method === method}
                        onChange={handlePaymentChange}
                        className="method-radio"
                      />
                      <span className="method-label">
                        <span className="method-icon">{getMethodIcon(method)}</span>
                        <span className="method-text">
                          {method === 'cash' && 'Espèces'}
                          {method === 'check' && 'Chèque'}
                          {method === 'card' && 'Carte bancaire'}
                          {method === 'transfer' && 'Virement'}
                          {method === 'other' && 'Autre'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Notes (optionnel)</label>
                <textarea
                  name="notes"
                  value={paymentData.notes}
                  onChange={handlePaymentChange}
                  placeholder="Ex: Chèque n°12345, Virement ref: TRX-2024-001..."
                  rows="3"
                  className="notes-input"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${id}`)}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || remaining <= 0 || !paymentData.amount}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-small"></span>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      💳 Enregistrer le paiement
                      <span className="payment-amount-preview">
                        {paymentData.amount || '0.00'} TND
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Payment History */}
        <div className="payment-history-section">
          <div className="section-card">
            <div className="history-header">
              <h2>📊 Historique des paiements</h2>
              <span className="history-count">
                {payments.length} paiement{payments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="empty-history">
                <div className="empty-icon">📄</div>
                <h3>Aucun paiement enregistré</h3>
                <p className="empty-subtext">
                  C'est le premier paiement pour cette facture.
                  Les paiements futurs apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="payments-list">
                {payments.map((payment, index) => (
                  <div key={payment.id || index} className="payment-item">
                    <div className="payment-item-header">
                      <div className="payment-method">
                        <span className="method-icon-small">{getMethodIcon(payment.method)}</span>
                        <span className="method-name">
                          {payment.method === 'cash' && 'Espèces'}
                          {payment.method === 'check' && 'Chèque'}
                          {payment.method === 'card' && 'Carte bancaire'}
                          {payment.method === 'transfer' && 'Virement'}
                          {payment.method === 'other' && 'Autre'}
                        </span>
                        {payment.notes && (
                          <span className="has-notes-indicator" title="Avec notes">
                            📝
                          </span>
                        )}
                      </div>
                      <div className="payment-amount">{payment.amount.toFixed(2)} TND</div>
                    </div>
                    
                    <div className="payment-item-details">
                      <div className="payment-date">
                        <span className="date-icon">📅</span>
                        {formatDate(payment.createdAt)}
                      </div>
                      {payment.notes && (
                        <div className="payment-notes">
                          <span className="notes-icon">📝</span>
                          {payment.notes}
                        </div>
                      )}
                    </div>

                    {index < payments.length - 1 && <div className="payment-divider"></div>}
                  </div>
                ))}
              </div>
            )}

            <div className="history-summary">
              <div className="summary-item">
                <span className="summary-label">Total payé:</span>
                <span className="summary-value">{totalPaid.toFixed(2)} TND</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Reste à payer:</span>
                <span className="summary-value remaining-value">{remaining.toFixed(2)} TND</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Statut:</span>
                <span className={`status-badge ${remaining <= 0 ? 'paid' : 'pending'}`}>
                  {remaining <= 0 ? '✅ Payé' : '⏳ En attente'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info-panel">
          <details>
            <summary>Info de débogage</summary>
            <pre>
              Invoice ID: {id}
              Invoice Data: {JSON.stringify(invoice, null, 2)}
              Payments Count: {payments.length}
              Total Paid: {totalPaid}
              Remaining: {remaining}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;