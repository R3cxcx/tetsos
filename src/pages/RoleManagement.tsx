import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { RolePermissionsMatrix } from '@/components/RolePermissionsMatrix';

export default function RoleManagement() {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !hasRole('super_admin')) {
    return <Navigate to="/auth" replace />;
  }

  return <RolePermissionsMatrix />;
}