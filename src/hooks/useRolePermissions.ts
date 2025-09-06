import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Shield, Settings } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type AppPermission = Database['public']['Enums']['app_permission'];

export interface RolePermission {
  id: string;
  role: AppRole;
  permission: AppPermission;
}

export interface PermissionCategory {
  name: string;
  permissions: string[];
  icon: any;
  description: string;
}

export interface AppCategory {
  name: string;
  icon: any;
  description: string;
  permissionCategories: PermissionCategory[];
}

export const APP_CATEGORIES: AppCategory[] = [
  {
    name: 'HR Management',
    icon: Users,
    description: 'Human Resources management modules',
    permissionCategories: [
      {
        name: 'Employees',
        permissions: ['employees.read', 'employees.create', 'employees.update', 'employees.delete'],
        icon: Users,
        description: 'Manage employee records and data'
      },
      {
        name: 'Attendance',
        permissions: ['attendance.read', 'attendance.create', 'attendance.update', 'attendance.delete'],
        icon: Users,
        description: 'Manage employee attendance records'
      },
      {
        name: 'Recruitment',
        permissions: ['recruitment.read', 'recruitment.create', 'recruitment.update', 'recruitment.delete'],
        icon: UserPlus,
        description: 'Manage recruitment processes and candidates'
      }
    ]
  },
  {
    name: 'Finance Management',
    icon: Settings,
    description: 'Financial management and cost centers',
    permissionCategories: [
      {
        name: 'Cost Centers',
        permissions: ['cost_centers.read', 'cost_centers.create', 'cost_centers.update', 'cost_centers.delete'],
        icon: Settings,
        description: 'Manage financial cost centers'
      },
      {
        name: 'Budget Management',
        permissions: ['budget.read', 'budget.create', 'budget.update', 'budget.delete'],
        icon: Settings,
        description: 'Manage budgets and financial planning'
      }
    ]
  },
  {
    name: 'System Administration',
    icon: Shield,
    description: 'System-wide settings and user management',
    permissionCategories: [
      {
        name: 'User Management',
        permissions: ['users.read', 'users.create', 'users.update', 'users.delete'],
        icon: UserPlus,
        description: 'Manage user accounts and access'
      },
      {
        name: 'Role Management',
        permissions: ['roles.read', 'roles.create', 'roles.update', 'roles.delete'],
        icon: Shield,
        description: 'Manage roles and permissions'
      },
      {
        name: 'System Settings',
        permissions: ['settings.read', 'settings.update'],
        icon: Settings,
        description: 'Manage system configuration'
      }
    ]
  }
];

// Flattened categories for backward compatibility
export const PERMISSION_CATEGORIES: PermissionCategory[] = APP_CATEGORIES.flatMap(app => app.permissionCategories);

export const ALL_ROLES: AppRole[] = [
  'super_admin',
  'admin', 
  'hr_manager',
  'hr_staff',
  'recruiter',
  'employee'
];

export function useRolePermissions() {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRolePermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');

      if (error) throw error;
      setRolePermissions(data || []);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load role permissions';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const hasPermission = (role: AppRole, permission: AppPermission): boolean => {
    return rolePermissions.some(rp => rp.role === role && rp.permission === permission);
  };

  const togglePermission = async (role: AppRole, permission: AppPermission): Promise<boolean> => {
    setUpdating(true);
    try {
      const hasCurrentPermission = hasPermission(role, permission);
      
      if (hasCurrentPermission) {
        // Remove permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', role)
          .eq('permission', permission);

        if (error) throw error;

        setRolePermissions(prev => 
          prev.filter(rp => !(rp.role === role && rp.permission === permission))
        );

        toast({
          title: "Permission Removed",
          description: `Removed ${permission} from ${role}`,
        });
      } else {
        // Add permission
        const { error } = await supabase
          .from('role_permissions')
          .insert([{ role, permission }]);

        if (error) throw error;

        const newRolePermission = {
          id: crypto.randomUUID(),
          role,
          permission
        };

        setRolePermissions(prev => [...prev, newRolePermission]);

        toast({
          title: "Permission Added",
          description: `Added ${permission} to ${role}`,
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchRolePermissions();
  }, [fetchRolePermissions]);

  return {
    rolePermissions,
    loading,
    updating,
    error,
    hasPermission,
    togglePermission,
    fetchRolePermissions
  };
}