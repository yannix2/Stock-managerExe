import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi } from '../api/stockApi';

const Logout = ({ onLogout }) => {
  useEffect(() => {
    authApi.logout();       // remove token from localStorage
    if (onLogout) onLogout(); // update App.jsx state
  }, [onLogout]);

  return <Navigate to="/login" replace />;
};

export default Logout;
