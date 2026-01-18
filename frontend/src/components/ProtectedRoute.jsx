import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi } from '../api/stockApi';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsAuthenticated(false);
          setIsChecking(false);
          return;
        }

        // You could add token validation API call here if needed
        // Example: const response = await authApi.validateToken(token);
        
        const user = authApi.getCurrentUser();
        
        if (user) {
          setIsAuthenticated(true);
          setUserRole(user.role || 'user');
        } else {
          setIsAuthenticated(false);
        }
        
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        
        // Clear invalid token
        authApi.logout();
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();

    // Listen for storage changes (for logout from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div className="auth-checking">
        <div className="auth-spinner"></div>
        <p>Vérification de l'authentification...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check admin role if required
  if (requireAdmin && userRole !== 'admin') {
    return (
      <div className="access-denied">
        <h2>Accès Refusé</h2>
        <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        <button onClick={() => window.location.href = '/dashboard'}>
          Retour au Dashboard
        </button>
      </div>
    );
  }

  // If authenticated (and role matches if required), render children
  return children;
};

export default ProtectedRoute;