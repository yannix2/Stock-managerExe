import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceApi, customerApi, productApi } from '../api/stockApi';
import './NewInvoice.css';

const NewInvoice = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    type: 'invoice',
    customerId: '',
    due_date: '',
    notes: '',
    items: []
  });
  
  const [customers, setCustomers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newItem, setNewItem] = useState({
    productId: '',
    quantity: 1,
    unit_price: 0
  });

  // Search and filter states
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // Refs for dropdown handling
  const customerDropdownRef = useRef(null);
  const productDropdownRef = useRef(null);

  useEffect(() => {
    fetchData();
    
    // Close dropdowns when clicking outside
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [customersData, productsData] = await Promise.all([
        customerApi.getAll(),
        productApi.getAll()
      ]);
      
      setCustomers(customersData || []);
      setAllProducts(productsData || []);
      setFilteredProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Erreur de chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  // Search products via API with debouncing
  const searchProducts = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredProducts(allProducts);
      return;
    }

    setIsSearchingProducts(true);
    try {
      const searchResults = await productApi.search(searchTerm);
      setFilteredProducts(searchResults || []);
    } catch (error) {
      console.error('Error searching products:', error);
      // Fallback to local filtering if API fails
      const filtered = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomerSearch = (e) => {
    const value = e.target.value;
    setCustomerSearch(value);
    
    if (value) {
      setShowCustomerDropdown(true);
    } else {
      setShowCustomerDropdown(false);
    }
  };

  const handleProductSearch = (e) => {
    const value = e.target.value;
    setProductSearch(value);
    
    if (value) {
      setShowProductDropdown(true);
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        searchProducts(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setShowProductDropdown(false);
      setFilteredProducts(allProducts);
    }
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id
    }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'unit_price' 
        ? parseFloat(value) || 0 
        : value
    }));
    
    // Update unit price when product is selected
    if (name === 'productId') {
      const product = allProducts.find(p => p.id == value);
      if (product && product.selling_price) {
        setNewItem(prev => ({
          ...prev,
          productId: value,
          unit_price: product.selling_price
        }));
        setProductSearch(product.name);
      }
    }
  };

  const selectProductFromDropdown = (product) => {
    setNewItem(prev => ({
      ...prev,
      productId: product.id,
      unit_price: product.selling_price || 0
    }));
    setProductSearch(product.name);
    setShowProductDropdown(false);
  };

  const addItem = () => {
    if (!newItem.productId || newItem.quantity <= 0) {
      alert('Veuillez sélectionner un produit et une quantité valide');
      return;
    }

    const product = allProducts.find(p => p.id == newItem.productId);
    if (!product) return;

    const existingItemIndex = formData.items.findIndex(item => item.productId == newItem.productId);
    
    if (existingItemIndex !== -1) {
      // Update existing item quantity
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += newItem.quantity;
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      // Add new item
      const item = {
        productId: newItem.productId,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price || product.selling_price || 0,
        productName: product.name,
        productReference: product.reference
      };
      
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, item]
      }));
    }

    // Reset new item form
    setNewItem({
      productId: '',
      quantity: 1,
      unit_price: 0
    });
    setProductSearch('');
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const updateItemQuantity = (index, newQuantity) => {
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = newQuantity;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const updateItemPrice = (index, newPrice) => {
    const updatedItems = [...formData.items];
    updatedItems[index].unit_price = newPrice;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.19; // 19% TVA
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      setError('Veuillez sélectionner un client');
      return;
    }

    if (formData.items.length === 0) {
      setError('Veuillez ajouter au moins un produit');
      return;
    }

    // Check for stock issues
    const stockIssues = formData.items.filter(item => {
      const product = allProducts.find(p => p.id == item.productId);
      return product && product.quantity_in_stock < item.quantity && formData.type === 'invoice';
    });

    if (stockIssues.length > 0) {
      if (!window.confirm('Certains produits ont un stock insuffisant. Voulez-vous continuer quand même ?')) {
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const invoiceData = {
        customerId: parseInt(formData.customerId),
        type: formData.type,
        due_date: formData.due_date || undefined,
        notes: formData.notes || '',
        items: formData.items.map(item => ({
          productId: parseInt(item.productId),
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      const result = await invoiceApi.create(invoiceData);
      
      if (result.invoice) {
        alert(`${formData.type === 'invoice' ? 'Facture' : 'Devis'} créé avec succès! Numéro: ${result.invoice.id}`);
        navigate('/invoices');
      } else {
        throw new Error('Erreur lors de la création de la facture');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError(error.message || 'Erreur lors de la création de la facture');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id == customerId);
    return customer ? customer.name : 'Client inconnu';
  };

  const getProductName = (productId) => {
    const product = allProducts.find(p => p.id == productId);
    return product ? product.name : 'Produit inconnu';
  };

  const getProductStock = (productId) => {
    const product = allProducts.find(p => p.id == productId);
    return product ? product.quantity_in_stock : 0;
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customerSearch === '' || 
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone?.includes(customerSearch)
  );

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="new-invoice-container">
      <div className="page-header">
        <h1>Nouvelle {formData.type === 'invoice' ? 'Facture' : 'Devis'}</h1>
        <button onClick={() => navigate('/invoices')} className="btn-secondary">
          ← Retour aux factures
        </button>
      </div>

      <form onSubmit={handleSubmit} className="invoice-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-sections">
          {/* Left Column - Customer & Info */}
          <div className="form-column">
            <div className="form-section">
              <h3>Informations Client</h3>
              <div className="form-group" ref={customerDropdownRef}>
                <label>Client *</label>
                <div className="search-wrapper">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={handleCustomerSearch}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Rechercher un client par nom, email ou téléphone..."
                    className="search-input"
                  />
                  <button
                    type="button"
                    onClick={() => navigate('/new-customer')}
                    className="quick-add-btn"
                    title="Ajouter un nouveau client"
                  >
                    + Nouveau
                  </button>
                </div>
                
                {showCustomerDropdown && (
                  <div className="dropdown-menu customer-dropdown">
                    {filteredCustomers.length === 0 ? (
                      <div className="dropdown-empty">
                        <p>Aucun client trouvé</p>
                        <button
                          type="button"
                          onClick={() => navigate('/new-customer')}
                          className="btn-primary"
                        >
                          + Ajouter un nouveau client
                        </button>
                      </div>
                    ) : (
                      <>
                        {filteredCustomers.map(customer => (
                          <div
                            key={customer.id}
                            className="dropdown-item"
                            onClick={() => selectCustomer(customer)}
                          >
                            <div className="customer-info">
                              <strong>{customer.name}</strong>
                              <div className="customer-details">
                                <span>{customer.email || 'Pas d\'email'}</span>
                                <span>{customer.phone || 'Pas de téléphone'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
                
                {/* Hidden select for form submission */}
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleFormChange}
                  required
                  style={{ display: 'none' }}
                >
                  <option value="">Sélectionner un client</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.customerId && (
                <div className="customer-info-card">
                  <h4>Client sélectionné</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Nom:</span>
                      <span className="value">{getCustomerName(formData.customerId)}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Email:</span>
                      <span className="value">
                        {customers.find(c => c.id == formData.customerId)?.email || '-'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">Téléphone:</span>
                      <span className="value">
                        {customers.find(c => c.id == formData.customerId)?.phone || '-'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, customerId: '' }));
                      setCustomerSearch('');
                    }}
                    className="btn-text"
                  >
                    Changer de client
                  </button>
                </div>
              )}
            </div>

            <div className="form-section">
              <h3>Type de Document</h3>
              <div className="type-selector">
                <button
                  type="button"
                  className={`type-btn ${formData.type === 'invoice' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'invoice' }))}
                >
                  🧾 Facture
                </button>
                <button
                  type="button"
                  className={`type-btn ${formData.type === 'quote' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'quote' }))}
                >
                  📋 Devis
                </button>
              </div>

              <div className="form-group">
                <label>Date d'échéance</label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleFormChange}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Notes (optionnel)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows="4"
                  placeholder="Notes supplémentaires pour le client..."
                />
              </div>
            </div>
          </div>

          {/* Right Column - Products & Summary */}
          <div className="form-column">
            <div className="form-section">
              <h3>Ajouter des Produits</h3>
              <div className="add-product-form" ref={productDropdownRef}>
                <div className="product-selector">
                  <div className="form-group">
                    <label>Produit</label>
                    <div className="search-wrapper">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={handleProductSearch}
                        onFocus={() => setShowProductDropdown(true)}
                        placeholder="Rechercher un produit par nom, référence..."
                        className="search-input"
                      />
                      <button
                        type="button"
                        onClick={() => navigate('/new-product')}
                        className="quick-add-btn"
                        title="Ajouter un nouveau produit"
                      >
                        + Nouveau
                      </button>
                    </div>
                    
                    {showProductDropdown && (
                      <div className="dropdown-menu product-dropdown">
                        {isSearchingProducts ? (
                          <div className="loading-small">
                            <div className="spinner-small"></div>
                            <p>Recherche en cours...</p>
                          </div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="dropdown-empty">
                            <p>Aucun produit trouvé</p>
                            <button
                              type="button"
                              onClick={() => navigate('/new-product')}
                              className="btn-primary"
                            >
                              + Ajouter un nouveau produit
                            </button>
                          </div>
                        ) : (
                          <>
                            {filteredProducts.map(product => (
                              <div
                                key={product.id}
                                className="dropdown-item"
                                onClick={() => selectProductFromDropdown(product)}
                              >
                                <div className="product-info">
                                  <div className="product-header">
                                    <strong>{product.name}</strong>
                                    <span className="product-price">
                                      {product.selling_price?.toFixed(2)} TND
                                    </span>
                                  </div>
                                  <div className="product-details">
                                    <span>Réf: {product.reference}</span>
                                    <span className={`stock-badge ${product.quantity_in_stock <= 10 ? 'low-stock' : ''}`}>
                                      Stock: {product.quantity_in_stock}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Quantité</label>
                      <input
                        type="number"
                        name="quantity"
                        value={newItem.quantity}
                        onChange={handleItemChange}
                        min="1"
                        disabled={!newItem.productId}
                      />
                    </div>

                    <div className="form-group">
                      <label>Prix unitaire (TND)</label>
                      <input
                        type="number"
                        name="unit_price"
                        value={newItem.unit_price}
                        onChange={handleItemChange}
                        min="0"
                        step="0.01"
                        disabled={!newItem.productId}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addItem}
                    className="btn-primary add-btn"
                    disabled={!newItem.productId}
                  >
                    + Ajouter au panier
                  </button>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Produits Sélectionnés ({formData.items.length})</h3>
              {formData.items.length === 0 ? (
                <div className="empty-cart">
                  <p>Aucun produit ajouté</p>
                </div>
              ) : (
                <div className="items-list">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Quantité</th>
                        <th>Prix unitaire</th>
                        <th>Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => {
                        const stock = getProductStock(item.productId);
                        const isOutOfStock = stock < item.quantity && formData.type === 'invoice';
                        
                        return (
                          <tr key={index} className={isOutOfStock ? 'out-of-stock' : ''}>
                            <td>
                              <div className="product-cell">
                                <strong>{item.productName}</strong>
                                <small>Réf: {item.productReference}</small>
                                {isOutOfStock && (
                                  <span className="stock-warning">
                                    ⚠️ Stock insuffisant ({stock} disponible)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                min="1"
                                className="quantity-input"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                className="price-input"
                              />
                            </td>
                            <td>
                              <strong className="item-total">
                                {(item.quantity * item.unit_price).toFixed(2)} TND
                              </strong>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="remove-btn"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="form-section">
              <h3>Récapitulatif</h3>
              <div className="summary-card">
                <div className="summary-row">
                  <span>Sous-total:</span>
                  <span>{calculateSubtotal().toFixed(2)} TND</span>
                </div>
                <div className="summary-row">
                  <span>TVA (19%):</span>
                  <span>{calculateTax().toFixed(2)} TND</span>
                </div>
                <div className="summary-row total">
                  <span>Total TTC:</span>
                  <span className="total-amount">{calculateTotal().toFixed(2)} TND</span>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => navigate('/invoices')}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || formData.items.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-small"></span>
                      Création en cours...
                    </>
                  ) : (
                    `Créer ${formData.type === 'invoice' ? 'la Facture' : 'le Devis'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewInvoice;