import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Position {
  id: string;
  title: string;
  department_id?: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  department?: Department;
}

export interface EmployeeStatus {
  id: string;
  status: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Nationality {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface EmployeeCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateDepartmentData {
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreatePositionData {
  title: string;
  department_id?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateEmployeeStatusData {
  status: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateNationalityData {
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface CreateEmployeeCategoryData {
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export const useMasterData = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [employeeCategories, setEmployeeCategories] = useState<EmployeeCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all master data
  const fetchMasterData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch departments
      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Fetch positions with departments
      const { data: positionsData, error: posError } = await supabase
        .from('positions')
        .select(`
          *,
          department:departments(*)
        `)
        .eq('is_active', true)
        .order('title');

      // Fetch employee statuses
      const { data: statusesData, error: statusError } = await supabase
        .from('employee_statuses')
        .select('*')
        .eq('is_active', true)
        .order('status');

      // Fetch nationalities
      const { data: nationalitiesData, error: natError } = await supabase
        .from('nationalities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Fetch employee categories
      const { data: categoriesData, error: catError } = await supabase
        .from('employee_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (deptError) throw deptError;
      if (posError) throw posError;
      if (statusError) throw statusError;
      if (natError) throw natError;
      if (catError) throw catError;

      setDepartments(departmentsData || []);
      setPositions(positionsData || []);
      setEmployeeStatuses(statusesData || []);
      setNationalities(nationalitiesData || []);
      setEmployeeCategories(categoriesData || []);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching master data:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to fetch master data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Department CRUD operations
  const createDepartment = async (departmentData: CreateDepartmentData) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{ ...departmentData, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;

      setDepartments(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Department created successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error creating department:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  const updateDepartment = async (id: string, updates: Partial<CreateDepartmentData>) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setDepartments(prev => prev.map(dept => dept.id === id ? data : dept));
      toast({
        title: "Success",
        description: "Department updated successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error updating department:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setDepartments(prev => prev.filter(dept => dept.id !== id));
      toast({
        title: "Success",
        description: "Department deactivated successfully",
      });

      return { error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error deactivating department:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: err };
    }
  };

  // Position CRUD operations
  const createPosition = async (positionData: CreatePositionData) => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .insert([{ ...positionData, created_by: user?.id }])
        .select(`
          *,
          department:departments(*)
        `)
        .single();

      if (error) throw error;

      setPositions(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Position created successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error creating position:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  const updatePosition = async (id: string, updates: Partial<CreatePositionData>) => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          department:departments(*)
        `)
        .single();

      if (error) throw error;

      setPositions(prev => prev.map(pos => pos.id === id ? data : pos));
      toast({
        title: "Success",
        description: "Position updated successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error updating position:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  const deletePosition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('positions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setPositions(prev => prev.filter(pos => pos.id !== id));
      toast({
        title: "Success",
        description: "Position deactivated successfully",
      });

      return { error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error deactivating position:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: err };
    }
  };

  // Similar CRUD operations for other entities would follow the same pattern
  // For brevity, I'll include create functions for the other entities

  const createNationality = async (nationalityData: CreateNationalityData) => {
    try {
      const { data, error } = await supabase
        .from('nationalities')
        .insert([{ ...nationalityData, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;

      setNationalities(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Nationality created successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error creating nationality:', err);
      toast({
        title: "Error",
        description: (err as Error)?.message || 'Failed to create nationality',
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  const createEmployeeCategory = async (categoryData: CreateEmployeeCategoryData) => {
    try {
      const { data, error } = await supabase
        .from('employee_categories')
        .insert([{ ...categoryData, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;

      setEmployeeCategories(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Employee category created successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error creating employee category:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  const importPositionsFromStaging = async () => {
    try {
      setLoading(true);
      
      // Get unique positions from staging data
      const { data: stagingPositions, error: stagingError } = await supabase
        .from('employees_staging')
        .select('position')
        .not('position', 'is', null);

      if (stagingError) throw stagingError;

      // Clean and deduplicate positions
      const cleanPositions = Array.from(new Set(
        stagingPositions
          .map(item => item.position?.trim())
          .filter(pos => pos && pos !== '' && pos !== '#N/A' && pos !== '0' && !pos.startsWith('|'))
      ));

      // Get existing positions to avoid duplicates
      const { data: existingPositions, error: existingError } = await supabase
        .from('positions')
        .select('title');

      if (existingError) throw existingError;

      const existingTitles = new Set(existingPositions.map(p => p.title.toLowerCase()));
      
      // Filter out existing positions
      const newPositions = cleanPositions.filter(pos => 
        !existingTitles.has(pos.toLowerCase())
      );

      if (newPositions.length === 0) {
        toast({
          title: "Info",
          description: "No new positions to import",
        });
        return { error: null, data: [] };
      }

      // Insert new positions
      const positionsToInsert = newPositions.map(title => ({
        title,
        is_active: true,
        created_by: user?.id
      }));

      const { data, error } = await supabase
        .from('positions')
        .insert(positionsToInsert)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully imported ${newPositions.length} new positions`,
      });
      
      await fetchMasterData();
      
      return { error: null, data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error importing positions:', error);
      toast({
        title: "Error",
        description: "Failed to import positions from staging",
        variant: "destructive",
      });
      return { error, data: null };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [user]);

  return {
    // Data
    departments,
    positions,
    employeeStatuses,
    nationalities,
    employeeCategories,
    loading,
    error,
    
    // Functions
    fetchMasterData,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createPosition,
    updatePosition,
    deletePosition,
    createNationality,
    createEmployeeCategory,
    importPositionsFromStaging,
  };
};