"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'disabled' | 'pending' | 'rejected';
  plan: 'free' | 'paid' | 'enterprise';
  tokens: number;
  points: number;
  referral_count?: number;
  lead_access_enabled?: boolean;
  must_change_password?: boolean;
  organization?: {
    _id: string;
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeOrgId: string | null;
  permissions: Set<string>;
  setActiveOrgId: (id: string | null) => void;
  hasPermission: (permission: string) => boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());

  // Load initial state
  useEffect(() => {
    const storedUser = localStorage.getItem('hunter_user');
    const storedOrgId = localStorage.getItem('active_org_id');
    const token = localStorage.getItem('hunter_token');
    
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedOrgId) setActiveOrgIdState(storedOrgId);
    
    if (token) {
      fetchIdentity();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchIdentity = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/me');
      const userData = data.data || data;
      setUser(userData);
      localStorage.setItem('hunter_user', JSON.stringify(userData));
      
      // Auto-select organization if none active
      let orgToFetch = activeOrgId;
      if (!orgToFetch && userData.organization) {
        const orgId = typeof userData.organization === 'string' 
          ? userData.organization 
          : (userData.organization._id?.toString() || userData.organization._id);
        
        setActiveOrgIdState(orgId);
        localStorage.setItem('active_org_id', orgId);
        orgToFetch = orgId;
      }

      // Fetch permissions for current context
      await fetchPermissions(orgToFetch);
    } catch (error) {
      console.error('Failed to fetch identity', error);
      // If unauthorized, logout
      if ((error as any).response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (orgId: string | null) => {
    try {
      // We'll use the RBAC assignment endpoint to get resolved permissions
      // For now, we'll assume a dedicated endpoint or compute from assignments
      // In our current backend, authorize middleware calls getUserPermissions
      // Let's create a specific /auth/permissions endpoint on the backend for this
      const { data } = await api.get('/rbac/my-permissions', {
        headers: orgId ? { 'x-org-id': orgId } : {}
      });
      const permissionsArray = data.data?.permissions || data.data || [];
      setPermissions(new Set(Array.isArray(permissionsArray) ? permissionsArray : []));
    } catch (error) {
      console.error('Failed to fetch permissions', error);
      setPermissions(new Set());
    }
  };

  const setActiveOrgId = (id: any) => {
    const orgId = id && typeof id === 'object' ? id._id : id;
    setActiveOrgIdState(orgId);
    if (orgId) {
      localStorage.setItem('active_org_id', orgId);
    } else {
      localStorage.removeItem('active_org_id');
    }
    fetchPermissions(orgId);
  };

  const hasPermission = useCallback((required: string): boolean => {
    if (permissions.has('*')) return true;
    if (permissions.has(required)) return true;
    
    const [resource] = required.split(':');
    if (permissions.has(`${resource}:*`)) return true;
    
    return false;
  }, [permissions]);

  const logout = () => {
    localStorage.removeItem('hunter_token');
    localStorage.removeItem('hunter_refresh_token');
    localStorage.removeItem('hunter_user');
    localStorage.removeItem('active_org_id');
    setUser(null);
    setPermissions(new Set());
    
    // Prevent redirect loop if already on auth pages
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      activeOrgId, 
      permissions, 
      setActiveOrgId, 
      hasPermission, 
      logout,
      refreshUser: fetchIdentity
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
