import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/stockApi';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await productApi.getAll();
      setProducts(data);
      setFilteredProducts(data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    let filtered = products;
    
    if (term) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.reference.toLowerCase().includes(term) ||
        (product.compatible_references && product.compatible_references.toLowerCase().includes(term))
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    if (category) {
      setFilteredProducts(products.filter(p => p.category === category));
    } else {
      setFilteredProducts(products);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir désactiver ce produit?')) {
      try {
        await productApi.delete(id);
        fetchProducts();
        alert('Produit désactivé avec succès');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const getStockStatus = (quantity, threshold) => {
    if (quantity <= 0) return { label: 'Rupture', class: 'out-of-stock' };
    if (quantity <= threshold) return { label: 'Faible', class: 'low-stock' };
    return { label: 'Normal', class: 'in-stock' };
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <div>
          <h1>Gestion des Produits</h1>
          <p>{filteredProducts.length} produits trouvés</p>
        </div>
        <Link to="/new-product" className="btn-primary">
          + Nouveau Produit
        </Link>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Rechercher produit, référence..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="filter-options">
          <select 
            value={selectedCategory} 
            onChange={(e) => handleCategoryFilter(e.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
              setFilteredProducts(products);
            }}
            className="btn-secondary"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Marque</th>
                <th>Stock</th>
                <th>Seuil</th>
                <th>Prix Achat</th>
                <th>Prix Vente</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const status = getStockStatus(product.quantity_in_stock, product.threshold);
                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.reference}</strong>
                    </td>
                    <td>
                      <div className="product-name">
                        {product.name}
                        {product.compatible_references && (
                          <small>Compatible: {product.compatible_references}</small>
                        )}
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td>{product.brand}</td>
                    <td>
                      <span className={`stock-value ${status.class}`}>
                        {product.quantity_in_stock}
                      </span>
                    </td>
                    <td>{product.threshold}</td>
                    <td>{product.purchase_price ? `${product.purchase_price} TND` : '-'}</td>
                    <td>{product.selling_price ? `${product.selling_price} TND` : '-'}</td>
                    <td>
                      <span className={`status-badge ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <Link to={`/edit-product/${product.id}`} className="btn-icon" title="Modifier">
                          ✏️
                        </Link>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="btn-icon danger"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                        <Link to={`/view-product/${product.id}`} className="btn-icon" title="Voir détails">
                          👁️
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <div className="empty-state">
              <p>Aucun produit trouvé</p>
              <Link to="/new-product" className="btn-primary">
                Ajouter un premier produit
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="summary-cards">
        <div className="summary-card">
          <h3>Stock Total</h3>
          <p className="total">{products.reduce((sum, p) => sum + p.quantity_in_stock, 0)}</p>
        </div>
        <div className="summary-card warning">
          <h3>Produits en Rupture</h3>
          <p className="total">
            {products.filter(p => p.quantity_in_stock <= 0).length}
          </p>
        </div>
        <div className="summary-card alert">
          <h3>Stock Faible</h3>
          <p className="total">
            {products.filter(p => 
              p.quantity_in_stock > 0 && p.quantity_in_stock <= p.threshold
            ).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Products;