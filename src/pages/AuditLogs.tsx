import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, User, FileText, UserCheck, UserMinus, Plus, Edit, Trash, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'user_login':
    case 'user_logout':
      return <User className="h-4 w-4" />;
    case 'role_assigned':
      return <UserCheck className="h-4 w-4" />;
    case 'role_removed':
      return <UserMinus className="h-4 w-4" />;
    case 'employee_created':
    case 'recruitment_request_created':
      return <Plus className="h-4 w-4" />;
    case 'employee_updated':
    case 'profile_updated':
      return <Edit className="h-4 w-4" />;
    case 'employee_deleted':
      return <Trash className="h-4 w-4" />;
    case 'recruitment_request_approved':
      return <CheckCircle className="h-4 w-4" />;
    case 'recruitment_request_rejected':
      return <XCircle className="h-4 w-4" />;
    case 'sensitive_data_accessed':
      return <Shield className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'user_login':
    case 'employee_created':
    case 'recruitment_request_created':
    case 'role_assigned':
    case 'recruitment_request_approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'user_logout':
    case 'employee_updated':
    case 'profile_updated':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'employee_deleted':
    case 'role_removed':
    case 'recruitment_request_rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'sensitive_data_accessed':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

const formatEventType = (eventType: string) => {
  return eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function AuditLogs() {
  const { hasRole } = useAuth();
  const { data: auditLogs, isLoading, error } = useAuditLogs();

  // Check if user has admin access
  if (!hasRole('super_admin') && !hasRole('admin')) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Security audit trail for sensitive operations
          </p>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Administrative privileges required to view audit logs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Security audit trail for sensitive operations
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load audit logs. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Security audit trail for sensitive operations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Events
          </CardTitle>
          <CardDescription>
            Comprehensive logging of all sensitive operations and security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Audit logging system is active. Database triggers automatically track all sensitive operations including user management, employee data changes, and recruitment activities.
            </AlertDescription>
          </Alert>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEventIcon(log.event_type)}
                        <Badge variant="outline" className={getEventColor(log.event_type)}>
                          {formatEventType(log.event_type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.resource_type && (
                        <div className="text-sm">
                          <div className="font-medium">{log.resource_type}</div>
                          {log.resource_id && (
                            <div className="text-muted-foreground truncate max-w-[100px]">
                              {log.resource_id}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.actor_id && (
                        <div className="text-sm text-muted-foreground font-mono">
                          {log.actor_id.slice(0, 8)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.target_user_id && (
                        <div className="text-sm text-muted-foreground font-mono">
                          {log.target_user_id.slice(0, 8)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(log.created_at), 'MMM dd, yyyy')}
                        <div className="text-muted-foreground">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.metadata && (
                        <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {typeof log.metadata === 'object' 
                            ? Object.entries(log.metadata)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')
                            : log.metadata
                          }
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {auditLogs?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Shield className="h-8 w-8" />
                        <div>
                          <p className="font-medium">Audit System Active</p>
                          <p className="text-sm">Sensitive operations will be logged here automatically</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}