import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEmployeeSelfData } from '@/hooks/useEmployeeSelfData';
import { CreateRequestDialog } from '@/apps/hr/recruitment/components/CreateRequestDialog';
import { User, Calendar, MapPin, Phone, Mail, Building, Users, Shield, UserPlus } from 'lucide-react';

export default function EmployeeSelfService() {
  const { employeeData, loading, error } = useEmployeeSelfData();
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">
              View your personal employee information
            </p>
          </div>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading your profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !employeeData) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">
              View your personal employee information
            </p>
          </div>
          
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              This page shows your work-related information. Sensitive personal data is protected and only accessible by authorized HR personnel.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee Profile Not Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {error || "No employee record found for your account. Please contact HR for assistance."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    const name = employeeData.english_name || '';
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          View your personal employee information
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          This page shows your work-related information. Sensitive personal data is protected and only accessible by authorized HR personnel.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">
                  {employeeData.english_name}
                </h3>
                <p className="text-muted-foreground">Employee ID: {employeeData.employee_id}</p>
                <Badge variant={employeeData.status === 'active' ? 'default' : 'secondary'}>
                  {employeeData.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {employeeData.work_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{employeeData.work_phone}</span>
                </div>
              )}
              {employeeData.nationality && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{employeeData.nationality}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Position</label>
                <p className="text-sm">{employeeData.position_title || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-sm">{employeeData.category || 'Not specified'}</p>
              </div>
              {employeeData.date_of_joining && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Joining</label>
                    <p className="text-sm">
                      {new Date(employeeData.date_of_joining).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Qualifications */}
        {employeeData.qualifications && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{employeeData.qualifications}</p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowRequestDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Personnel Request Form
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Calendar className="h-4 w-4 mr-2" />
              Request Time Off
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <User className="h-4 w-4 mr-2" />
              Update Personal Information
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Building className="h-4 w-4 mr-2" />
              View Payslips
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Other features will be available soon. Contact HR for assistance.
            </p>
          </CardContent>
        </Card>
      </div>

      <CreateRequestDialog 
        open={showRequestDialog} 
        onOpenChange={setShowRequestDialog}
      />
    </div>
  );
}