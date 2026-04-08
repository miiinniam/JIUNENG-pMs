import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../services/authService';
import type { AppRole } from '../types/auth';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  moduleName?: string;
}

/**
 * 未登录 → /login；已登录但角色不符 → 按角色送回对应门户首页
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  moduleName,
}) => {
  const location = useLocation();
  const user = getCurrentUser();

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'agent') {
      return <Navigate to="/supplier" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (moduleName && user.role !== 'admin') {
    if (!user.permissions || !user.permissions.includes(moduleName)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
