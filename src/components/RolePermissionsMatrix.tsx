// @ts-nocheck
import { useState, useEffect } from 'react';
import { CheckCircle, Users, Clock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRolePermissions, APP_CATEGORIES, ALL_ROLES } from '@/hooks/useRolePermissions';
import { useAuth } from '@/contexts/AuthContext';
import CreateRoleDialog from '@/components/CreateRoleDialog';

export function RolePermissionsMatrix() {
  const { 
    rolePermissions, 
    loading, 
    error, 
    fetchRolePermissions, 
    hasPermission,
    togglePermission,
    updating
  } = useRolePermissions();
  
  const { user } = useAuth();
  const [showCreateRole, setShowCreateRole] = useState(false);


  const formatRoleName = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatPermissionName = (permission: string) => {
    const [category, action] = permission.split('.');
    return `${action.charAt(0).toUpperCase() + action.slice(1)} ${category}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading permissions...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-destructive">
            <p>Error loading permissions: {error}</p>
            <Button onClick={fetchRolePermissions} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if user is super admin
  const isSuperAdmin = user && hasPermission('super_admin', 'roles.create');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role & Permissions Matrix</h2>
          <p className="text-muted-foreground">
            Manage role-based access control for different user types
          </p>
        </div>
        
        {isSuperAdmin && (
          <Button onClick={() => setShowCreateRole(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      <Tabs defaultValue={APP_CATEGORIES[0]?.name} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {APP_CATEGORIES.map(app => (
            <TabsTrigger key={app.name} value={app.name} className="flex items-center gap-2">
              <app.icon className="h-4 w-4" />
              {app.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {APP_CATEGORIES.map(app => (
          <TabsContent key={app.name} value={app.name} className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <app.icon className="h-5 w-5" />
                {app.name}
              </h3>
              <p className="text-muted-foreground">{app.description}</p>
            </div>

            {app.permissionCategories.map(category => (
              <Card key={category.name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <category.icon className="h-5 w-5" />
                    {category.name}
                  </CardTitle>
                  <CardDescription>
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-4 items-center p-4 bg-muted/50 rounded-lg">
                      <div className="col-span-4 font-medium">Role</div>
                      {category.permissions.map(permission => (
                        <div key={permission} className="col-span-2 text-center font-medium text-sm">
                          {formatPermissionName(permission)}
                        </div>
                      ))}
                    </div>

                    {/* Role Rows */}
                    {ALL_ROLES.map(role => (
                      <div key={role} className="space-y-2">
                        <div className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg">
                          <div className="col-span-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <Badge variant="outline" className="mb-1">
                                {formatRoleName(role)}
                              </Badge>
                            </div>
                          </div>
                          
                          {category.permissions.map(permission => (
                            <div key={permission} className="col-span-2 flex justify-center">
                              <Checkbox
                                checked={hasPermission(role, permission)}
                                disabled={updating}
                                onCheckedChange={() => togglePermission(role, permission)}
                                className="h-5 w-5"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {updating && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Updating permissions...
          </div>
        </div>
      )}

      <CreateRoleDialog
        open={showCreateRole}
        onOpenChange={setShowCreateRole}
      />
    </div>
  );
}