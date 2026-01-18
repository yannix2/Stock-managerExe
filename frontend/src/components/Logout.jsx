import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi } from '../api/stockApi';

const Logout = () => {
  useEffect(() => {
    // Déconnexion propre
    authApi.logout();
    
    // Nettoyer les données en mémoire si nécessaire
    localStorage.clear();
    
    // Rafraîchir pour s'assurer que tout est nettoyé
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }, []);

  return (
    <div className="logout-container">
      <div className="logout-message">
        <h2>Déconnexion...</h2>
        <p>Vous allez être redirigé vers la page de connexion.</p>
      </div>
    </div>
  );
};

export default Logout;