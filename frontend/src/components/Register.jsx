import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/stockApi';
import './Register.css';

const Register = () => {
  const [userData, setUserData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    CodeSecret: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'password') {
      calculatePasswordStrength(value);
    }
    
    setError('');
    setSuccess('');
  };

  const calculatePasswordStrength = (password) => {
    if (password.length === 0) {
      setPasswordStrength('');
      return;
    }
    
    if (password.length < 6) {
      setPasswordStrength('weak');
    } else if (password.length < 8) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  const validateForm = () => {
    if (!userData.username || !userData.password || !userData.CodeSecret) {
      setError('Tous les champs sont requis');
      return false;
    }
    
    if (userData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    
    if (userData.password !== userData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    const registrationData = {
      username: userData.username,
      password: userData.password,
      CodeSecret: userData.CodeSecret
    };

    try {
      const response = await authApi.register(registrationData);
      console.log('Inscription réussie:', response);
      
      setSuccess('Compte créé avec succès ! Redirection vers la page de connexion...');
      
      // Rediriger vers la page de connexion après un délai
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      console.error('Erreur d\'inscription:', err);
      setError(err.message || 'Erreur lors de l\'inscription. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="register-logo">
            <h1>Société Espoir</h1>
            <p>STOCK MANAGER</p>
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            Créer un compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Créez votre compte administrateur
          </p>
        </div>
        
        <form className="register-form" onSubmit={handleSubmit}>
          {error && (
            <div className="register-error">
              {error}
            </div>
          )}
          
          {success && (
            <div className="register-success">
              {success}
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
              value={userData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Choisissez un nom d'utilisateur"
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
              value={userData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Minimum 6 caractères"
            />
            {passwordStrength && (
              <div className="password-strength">
                Force du mot de passe:
                <div className="strength-meter">
                  <div className={`strength-meter-fill strength-${passwordStrength}`}></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={userData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Confirmez votre mot de passe"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="CodeSecret">
              Code Secret
            </label>
            <input
              id="CodeSecret"
              name="CodeSecret"
              type="text"
              required
              value={userData.CodeSecret}
              onChange={handleChange}
              className="form-input"
              placeholder="Entrez votre code secret"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="register-button"
          >
            {loading ? 'Inscription en cours...' : 'Créer le compte'}
          </button>
          
          <div className="register-links">
            <p>
              Déjà un compte ?{' '}
              <Link to="/login" className="login-link">
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;