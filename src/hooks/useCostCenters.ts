import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateCostCenterData {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export const useCostCenters = () => {
  const { user } = useAuth();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cost centers
  const fetchCostCenters = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;

      setCostCenters(data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching cost centers:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to fetch cost centers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create cost center
  const createCostCenter = async (costCenterData: CreateCostCenterData) => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .insert([{ ...costCenterData, created_by: user?.id }])
        .select('*')
        .single();

      if (error) throw error;

      setCostCenters(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Cost center created successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error creating cost center:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  // Update cost center
  const updateCostCenter = async (id: string, updates: Partial<CreateCostCenterData>) => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      setCostCenters(prev => prev.map(cc => cc.id === id ? data : cc));
      toast({
        title: "Success",
        description: "Cost center updated successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error updating cost center:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  // Delete cost center (soft delete)
  const deleteCostCenter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cost_centers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setCostCenters(prev => prev.filter(cc => cc.id !== id));
      toast({
        title: "Success",
        description: "Cost center deactivated successfully",
      });

      return { error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error deactivating cost center:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: err };
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchCostCenters();

    const channel = supabase
      .channel('cost_centers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cost_centers'
        },
        () => {
          fetchCostCenters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    costCenters,
    loading,
    error,
    fetchCostCenters,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
  };
};