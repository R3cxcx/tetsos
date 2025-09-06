import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Loader2, Users, Settings as SettingsIcon, Link as LinkIcon, Shield, Hash } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import UserManagement from './UserManagement';
import UserEmployeeLink from './UserEmployeeLink';
import RoleManagement from './RoleManagement';
import IdSequenceManagement from './IdSequenceManagement';

export default function Settings() {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

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

  const isUsersActive = location.pathname.includes('/settings/users');
  const isUserEmployeeLinkActive = location.pathname.includes('/settings/user-employee-link');
  const isRoleManagementActive = location.pathname.includes('/settings/roles');
  const isSequencesActive = location.pathname.includes('/settings/sequences') || location.pathname.includes('/settings/employee-id');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application settings and configurations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={isUsersActive ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link to="/settings/users">
                    <Users className="h-4 w-4 mr-2" />
                    User Management
                  </Link>
                </Button>
                <Button
                  variant={isUserEmployeeLinkActive ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link to="/settings/user-employee-link">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    User-Employee Link
                  </Link>
                </Button>
                <Button
                  variant={isRoleManagementActive ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link to="/settings/roles">
                    <Shield className="h-4 w-4 mr-2" />
                    Role Management
                  </Link>
                </Button>
                <Button
                  variant={isSequencesActive ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link to="/settings/sequences">
                    <Hash className="h-4 w-4 mr-2" />
                    ID Sequences
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Routes>
              <Route path="/" element={
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome to Settings</CardTitle>
                    <CardDescription>
                      Select a configuration option from the sidebar to get started.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-dashed">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <Users className="h-8 w-8 text-primary" />
                            <div>
                              <h3 className="font-semibold">User Management</h3>
                              <p className="text-sm text-muted-foreground">
                                Manage users and assign roles
                              </p>
                            </div>
                          </div>
                           <Button asChild className="w-full mt-4">
                             <Link to="/settings/users">Manage Users</Link>
                           </Button>
                         </CardContent>
                       </Card>

                       <Card className="border-dashed">
                         <CardContent className="p-6">
                           <div className="flex items-center gap-4">
                             <LinkIcon className="h-8 w-8 text-primary" />
                             <div>
                               <h3 className="font-semibold">User-Employee Link</h3>
                               <p className="text-sm text-muted-foreground">
                                 Link user accounts to employee records
                               </p>
                             </div>
                           </div>
                           <Button asChild className="w-full mt-4">
                             <Link to="/settings/user-employee-link">Link Users</Link>
                           </Button>
                         </CardContent>
                       </Card>

                        <Card className="border-dashed">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <Shield className="h-8 w-8 text-primary" />
                              <div>
                                <h3 className="font-semibold">Role Management</h3>
                                <p className="text-sm text-muted-foreground">
                                  Configure role permissions and access
                                </p>
                              </div>
                            </div>
                            <Button asChild className="w-full mt-4">
                              <Link to="/settings/roles">Manage Roles</Link>
                            </Button>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Card className="border-dashed">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <Hash className="h-8 w-8 text-primary" />
                              <div>
                                <h3 className="font-semibold">ID Sequences</h3>
                                <p className="text-sm text-muted-foreground">
                                  Manage ID formats and sequences across modules
                                </p>
                              </div>
                            </div>
                            <Button asChild className="w-full mt-4">
                              <Link to="/settings/sequences">Manage Sequences</Link>
                            </Button>
                          </CardContent>
                        </Card>
                    </div>
                  </CardContent>
                </Card>
              } />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/user-employee-link" element={<UserEmployeeLink />} />
              <Route path="/roles" element={<RoleManagement />} />
              <Route path="/sequences" element={<IdSequenceManagement />} />
              <Route path="/employee-id" element={<IdSequenceManagement />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}