import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { ROUTES } from './routes.config';

interface PrivateRouteProps {
  children: React.ReactElement;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  return isAuthenticated ? children : <Navigate to={ROUTES.login} replace />;
};
