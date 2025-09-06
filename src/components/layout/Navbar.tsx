import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { LogOut, User, Settings, RefreshCw } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useRefresh } from '@/contexts/RefreshContext';

export function Navbar() {
  const { user, profile, roles, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshFunction } = useRefresh();

  if (!user) return null;

  const handleRefresh = () => {
    if (refreshFunction) {
      refreshFunction();
    } else {
      // Fallback to page refresh if no specific refresh function is available
      window.location.reload();
    }
  };

  if (!user) return null;

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user.email || 'User';
  };

  const getPrimaryRole = () => {
    if (roles.includes('super_admin')) return 'Super Admin';
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('hr_manager')) return 'HR Manager';
    if (roles.includes('hr_staff')) return 'HR Staff';
    return 'Employee';
  };

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', path: '/' }];

    if (pathSegments.length === 0) return breadcrumbs;

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      if (segment === 'hr') {
        breadcrumbs.push({ name: 'HR Management', path: currentPath });
      } else if (segment === 'finance') {
        breadcrumbs.push({ name: 'Finance', path: currentPath });
      } else if (segment === 'employees') {
        breadcrumbs.push({ name: 'Employees', path: currentPath });
      } else if (segment === 'data-upload') {
        breadcrumbs.push({ name: 'Data Upload', path: currentPath });
      } else if (segment === 'attendance') {
        breadcrumbs.push({ name: 'Attendance Management', path: currentPath });
        
        // Handle attendance sub-routes
        if (pathSegments[index + 1] === 'calendar') {
          breadcrumbs.push({ name: 'Calendar View', path: currentPath + '/calendar' });
        } else if (pathSegments[index + 1] === 'clock-in-out') {
          breadcrumbs.push({ name: 'Clock In/Out', path: currentPath + '/clock-in-out' });
        } else if (pathSegments[index + 1] === 'overview') {
          breadcrumbs.push({ name: 'Daily Overview', path: currentPath + '/overview' });
        } else if (pathSegments[index + 1] === 'reports') {
          breadcrumbs.push({ name: 'Reports', path: currentPath + '/reports' });
        } else if (pathSegments[index + 1] === 'raw-data') {
          breadcrumbs.push({ name: 'Raw Data', path: currentPath + '/raw-data' });
        }
      } else if (segment === 'recruitment') {
        breadcrumbs.push({ name: 'Recruitment', path: currentPath });
        
        // Handle recruitment sub-routes
        if (pathSegments[index + 1] === 'requests') {
          breadcrumbs.push({ name: 'Requests', path: currentPath + '/requests' });
        } else if (pathSegments[index + 1] === 'candidates') {
          breadcrumbs.push({ name: 'Candidates', path: currentPath + '/candidates' });
        } else if (pathSegments[index + 1] === 'tracker') {
          breadcrumbs.push({ name: 'Tracker', path: currentPath + '/tracker' });
        }
      } else if (segment === 'masterdata') {
        breadcrumbs.push({ name: 'Master Data', path: currentPath });
      } else if (segment === 'settings') {
        breadcrumbs.push({ name: 'Settings', path: currentPath });
      } else if (segment === 'users') {
        breadcrumbs.push({ name: 'User Management', path: currentPath });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-bold">IGCC System</h1>
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={breadcrumb.path}>
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{breadcrumb.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={breadcrumb.path}>{breadcrumb.name}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
              title="Refresh page data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {getPrimaryRole()}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}