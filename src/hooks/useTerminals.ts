import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Terminal {
  id: string;
  terminal_uid: string;
  terminal_name: string;
  location?: string;
  site_admin_name?: string;
  connection_method?: 'ethernet' | 'wifi' | 'usb' | 'serial';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTerminalData {
  terminal_uid: string;
  terminal_name: string;
  location?: string;
  site_admin_name?: string;
  connection_method?: 'ethernet' | 'wifi' | 'usb' | 'serial';
}

export const useTerminals = () => {
  return useQuery({
    queryKey: ['terminals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('terminals')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Terminal[];
    },
  });
};

export const useCreateTerminal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTerminalData) => {
      const { data: result, error } = await supabase
        .from('terminals')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
      toast({
        title: "Success",
        description: "Terminal created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create terminal",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTerminal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTerminalData> }) => {
      const { data: result, error } = await supabase
        .from('terminals')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
      toast({
        title: "Success",
        description: "Terminal updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update terminal",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTerminal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('terminals')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
      toast({
        title: "Success",
        description: "Terminal deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete terminal",
        variant: "destructive",
      });
    },
  });
};