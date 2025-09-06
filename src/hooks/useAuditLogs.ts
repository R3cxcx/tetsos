import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AuditLog {
  id: string;
  event_type: string;
  actor_id: string | null;
  target_user_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const useAuditLogs = () => {
  const { hasRole } = useAuth();
  
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async (): Promise<AuditLog[]> => {
      // Check permissions in frontend first
      if (!hasRole('super_admin') && !hasRole('admin')) {
        throw new Error('Access denied. Administrative privileges required.');
      }

      // For now, return empty array until types are regenerated
      // This will be updated once the database types include audit_logs
      const response = await fetch('/api/audit-logs', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      }).catch(() => ({ ok: false, json: () => Promise.resolve([]) }));
      
      if (!response.ok) {
        return [];
      }
      
      return response.json();
    },
    enabled: hasRole('super_admin') || hasRole('admin'), // Only run if user has admin access
  });
};

// Helper function to manually log audit events from the frontend
export const logAuditEvent = async (
  eventType: string,
  targetUserId?: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
) => {
  try {
    // For now, just log to console since we need types to be regenerated
    console.log('Audit Event:', {
      eventType,
      targetUserId,
      resourceType,
      resourceId,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    // This will be implemented once types are available
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to log audit event:', error);
    throw error;
  }
};