import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, UserPlus, Trash2, UserCheck, UserX, Clock } from 'lucide-react';
import { useRefresh } from '@/contexts/RefreshContext';
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
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  roles: AppRole[];
}

type AppRole = 'super_admin' | 'admin' | 'hr_manager' | 'hr_staff' | 'employee' | 'recruiter';
const availableRoles: AppRole[] = ['super_admin', 'admin', 'hr_manager', 'hr_staff', 'employee', 'recruiter'];

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  hr_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  hr_staff: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  employee: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
  recruiter: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);
  const { toast } = useToast();
  const { setRefreshFunction } = useRefresh();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setRefreshFunction(() => fetchUsers);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction]);

  const fetchUsers = async () => {
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
          created_at,
          approval_status,
          approved_by,
          approved_at
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles: UserWithRoles[] = profiles?.map(profile => ({
        ...profile,
        roles: userRoles?.filter(ur => ur.user_id === profile.user_id).map(ur => ur.role) || []
      })) || [];

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

  const assignRole = async (userId: string, role: AppRole) => {
    try {
      setAssigningRole(userId);

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Info",
            description: "User already has this role",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Success",
          description: `Role ${role} assigned successfully`,
        });
        fetchUsers(); // Refresh the data
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAssigningRole(null);
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${role} removed successfully`,
      });
      fetchUsers(); // Refresh the data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const approveUser = async (userId: string, defaultRole: AppRole = 'employee') => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      // Update approval status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          approval_status: 'approved',
          approved_by: currentUser.data.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Assign default role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: defaultRole,
          assigned_by: currentUser.data.user?.id
        });

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: `User approved and assigned ${defaultRole} role`,
      });
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: 'rejected',
          approved_by: currentUser.data.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User access request rejected",
      });
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading users...</p>
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
            <Shield className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and permissions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.first_name || user.last_name 
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : 'No name'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {user.user_id.slice(0, 8)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.approval_status === 'pending' && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {user.approval_status === 'approved' && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {user.approval_status === 'rejected' && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                          <UserX className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <div key={role} className="flex items-center gap-1">
                            <Badge 
                              variant="secondary" 
                              className={roleColors[role] || 'bg-gray-100 text-gray-800'}
                            >
                              {role.replace('_', ' ')}
                            </Badge>
                            {user.approval_status === 'approved' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Role</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove the "{role}" role from this user?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => removeRole(user.user_id, role)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        ))
                      ) : (
                        <Badge variant="outline">No roles</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.approval_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveUser(user.user_id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectUser(user.user_id)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {user.approval_status === 'approved' && (
                        <>
                          <Select 
                            onValueChange={(role) => assignRole(user.user_id, role as AppRole)}
                            disabled={assigningRole === user.user_id}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Add role" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRoles
                                .filter(role => !user.roles.includes(role))
                                .map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role.replace('_', ' ')}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {assigningRole === user.user_id && (
                            <div className="text-sm text-muted-foreground">
                              Assigning...
                            </div>
                          )}
                        </>
                      )}
                      {user.approval_status === 'rejected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveUser(user.user_id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}