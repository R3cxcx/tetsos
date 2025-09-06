import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Phone, Mail, Calendar, MapPin, User, Badge, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { useEmployees, Employee, CreateEmployeeData } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { EditEmployeeDialog } from "../components/EditEmployeeDialog";
import { toast } from "@/hooks/use-toast";

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employees, loading, updateEmployee } = useEmployees();
  const { hasPermission } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (id && employees.length > 0) {
      const foundEmployee = employees.find(emp => emp.id === id);
      if (foundEmployee) {
        setEmployee(foundEmployee);
      } else {
        toast({
          title: "Employee Not Found",
          description: "The requested employee could not be found.",
          variant: "destructive",
        });
        navigate("/hr/employees");
      }
    }
  }, [id, employees, navigate]);

  const handleEmployeeUpdate = async (employeeId: string, updates: Partial<CreateEmployeeData>) => {
    const result = await updateEmployee(employeeId, updates);
    if (!result.error && employee) {
      // Update local employee state immediately
      setEmployee(prev => prev ? { ...prev, ...updates } : null);
    }
    return result;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p>Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Employee not found</p>
          <Button onClick={() => navigate("/hr/employees")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = hasPermission('employees.update');

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/hr/employees")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{employee.english_name}</h1>
              {employee.arabic_name && (
                <p className="text-lg text-gray-600" dir="rtl">{employee.arabic_name}</p>
              )}
            </div>
          </div>
          
          {canEdit && (
            <Button onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Employee ID</span>
                <UIBadge variant="outline">{employee.employee_id}</UIBadge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <UIBadge className={getStatusColor(employee.status)}>
                  {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                </UIBadge>
              </div>

              {employee.category && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Category</span>
                  <span className="text-sm font-medium">{employee.category}</span>
                </div>
              )}

              {employee.nationality && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nationality</span>
                  <span className="text-sm font-medium">{employee.nationality}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Position Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Position Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employee.position && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Position</span>
                  <span className="text-sm font-medium">{employee.position}</span>
                </div>
              )}

              {employee.qualifications && (
                <div>
                  <span className="text-sm text-gray-600 block mb-2">Qualifications</span>
                  <span className="text-sm font-medium">{employee.qualifications}</span>
                </div>
              )}

              {employee.date_of_joining && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Date of Joining</span>
                  <span className="text-sm font-medium">
                    {new Date(employee.date_of_joining).toLocaleDateString()}
                  </span>
                </div>
              )}

              {employee.date_of_leaving && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Date of Leaving</span>
                  <span className="text-sm font-medium">
                    {new Date(employee.date_of_leaving).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employee.work_phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Work Phone</p>
                    <p className="text-sm font-medium">{employee.work_phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium">
                  {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm font-medium">
                  {employee.updated_at ? new Date(employee.updated_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Deletable</span>
                <UIBadge variant={employee.is_deletable ? "outline" : "destructive"}>
                  {employee.is_deletable ? 'Yes' : 'No'}
                </UIBadge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditEmployeeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        employee={employee}
        updateEmployeeFn={handleEmployeeUpdate}
      />
    </div>
  );
}