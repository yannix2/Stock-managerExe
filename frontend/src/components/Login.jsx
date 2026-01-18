import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/stockApi';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    CodeSecret: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!credentials.username || !credentials.password || !credentials.CodeSecret) {
      setError('Tous les champs sont requis');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.login(credentials);
      console.log('Connexion réussie:', response);
      
      // Rediriger vers le dashboard
      navigate('/dashboard', { replace: true });
      
      // Rafraîchir la page pour mettre à jour l'état d'authentification
      window.location.reload();
      
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError(err.message || 'Erreur lors de la connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <h1>Société Espoir</h1>
            <p>STOCK MANAGER</p>
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            Connexion
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connectez-vous à votre compte
          </p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="username">
              Nom d'utilisateur
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={credentials.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Entrez votre nom d'utilisateur"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={credentials.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Entrez votre mot de passe"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="CodeSecret">
              Code Secret
            </label>
            <input
              id="CodeSecret"
              name="CodeSecret"
              type="password"
              required
              value={credentials.CodeSecret}
              onChange={handleChange}
              className="form-input"
              placeholder="Entrez votre code secret"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
          
          <div className="login-links">
            <p>
              Pas encore de compte ?{' '}
              <Link to="/register" className="register-link">
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;