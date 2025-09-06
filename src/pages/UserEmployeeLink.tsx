import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Link, Unlink, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserWithRoles {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  roles: string[];
  linked_employee?: {
    employee_id: string;
    english_name: string;
    position?: string;
  };
}

interface Employee {
  id: string;
  employee_id: string;
  english_name: string;
  personal_email?: string;
  user_id?: string;
  position?: string;
  status: string;
}

export default function UserEmployeeLink() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          email,
          first_name,
          last_name,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch all employees using secure function
      const { data: employeesData, error: employeesError } = await supabase
        .rpc('get_employees_basic_data');

      if (employeesError) throw employeesError;

      

      // Combine the data - map employee data from RPC result
      const mappedEmployeesData = (employeesData || []).map((emp: { id: string; employee_id: string; english_name: string; user_id: string | null; position_title: string; status: string }) => ({
        id: emp.id,
        employee_id: emp.employee_id,
        english_name: emp.english_name,
        user_id: emp.user_id,
        position: emp.position_title, // Note: RPC returns position_title
        status: emp.status
      }));

      setEmployees(mappedEmployeesData);

      const usersWithRoles: UserWithRoles[] = profiles?.map(profile => {
        const userRolesList = userRoles?.filter(ur => ur.user_id === profile.user_id).map(ur => ur.role) || [];
        const linkedEmployee = mappedEmployeesData.find(emp => emp.user_id === profile.user_id);
        
        return {
          ...profile,
          roles: userRolesList,
          linked_employee: linkedEmployee ? {
            employee_id: linkedEmployee.employee_id,
            english_name: linkedEmployee.english_name,
            position: linkedEmployee.position
          } : undefined
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const linkUserToEmployee = async (userId: string, employeeId: string) => {
    try {
      setLinking(userId);

      // Update the employee record to link to the user
      const { error } = await supabase
        .from('employees')
        .update({ user_id: userId })
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User linked to employee successfully",
      });
      
      fetchData(); // Refresh the data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLinking(null);
    }
  };

  const unlinkUserFromEmployee = async (userId: string) => {
    try {
      setLinking(userId);

      // Remove the user link from the employee
      const { error } = await supabase
        .from('employees')
        .update({ user_id: null })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User unlinked from employee successfully",
      });
      
      fetchData(); // Refresh the data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLinking(null);
    }
  };

  const getUnlinkedEmployees = () => {
    return employees.filter(emp => !emp.user_id && emp.status === 'active');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading user-employee links...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Link className="h-8 w-8" />
            User-Employee Linking
          </h1>
          <p className="text-muted-foreground mt-1">
            Link user accounts to employee records for self-service access
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-medium">
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'No name'
                          }
                        </h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>

                      {user.linked_employee ? (
                        <div className="bg-green-50 p-2 rounded text-sm">
                          <div className="flex items-center gap-2 text-green-700">
                            <Link className="h-4 w-4" />
                            <span className="font-medium">Linked to:</span>
                          </div>
                          <p className="text-green-600 mt-1">
                            {user.linked_employee.english_name} ({user.linked_employee.employee_id})
                          </p>
                          {user.linked_employee.position && (
                            <p className="text-green-600 text-xs">{user.linked_employee.position}</p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-orange-50 p-2 rounded text-sm">
                          <div className="flex items-center gap-2 text-orange-700">
                            <AlertCircle className="h-4 w-4" />
                            <span>Not linked to any employee</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {user.linked_employee ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={linking === user.user_id}>
                              <Unlink className="h-4 w-4 mr-1" />
                              Unlink
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Unlink User from Employee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to unlink this user from their employee record? 
                                They will lose access to the employee self-service portal.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => unlinkUserFromEmployee(user.user_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Unlink
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Select onValueChange={(employeeId) => linkUserToEmployee(user.user_id, employeeId)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Link to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getUnlinkedEmployees().map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.english_name} ({employee.employee_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {linking === user.user_id && (
                        <div className="text-xs text-muted-foreground">
                          Processing...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Unlinked Employees */}
        <Card>
          <CardHeader>
            <CardTitle>Unlinked Employees ({getUnlinkedEmployees().length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getUnlinkedEmployees().map((employee) => (
                <div key={employee.id} className="border rounded-lg p-3">
                  <div>
                    <h4 className="font-medium">{employee.english_name}</h4>
                    <p className="text-sm text-muted-foreground">ID: {employee.employee_id}</p>
                    {employee.position && (
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                    )}
                    {employee.personal_email && (
                      <p className="text-sm text-muted-foreground">{employee.personal_email}</p>
                    )}
                  </div>
                </div>
              ))}
              {getUnlinkedEmployees().length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  All active employees are linked to user accounts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}