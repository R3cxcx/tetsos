import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Employee } from "@/hooks/useEmployees";
import { Phone, Calendar, MapPin, Building, CreditCard, User, Mail, Home, Heart, FileText, Users } from "lucide-react";

interface EmployeeProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export const EmployeeProfileDialog = ({ open, onOpenChange, employee }: EmployeeProfileDialogProps) => {
  if (!employee) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'inactive':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'pending':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getInitials = (englishName: string) => {
    const names = englishName.split(' ');
    return names.length >= 2 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : englishName.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Profile</DialogTitle>
          <DialogDescription>
            View detailed employee information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start space-x-4 p-6 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xl font-semibold text-primary">
                {getInitials(employee.english_name)}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {employee.english_name}
              </h3>
              {employee.arabic_name && (
                <p className="text-lg text-gray-600 mb-2" dir="rtl">{employee.arabic_name}</p>
              )}
              <div className="flex items-center space-x-3">
                <Badge 
                  variant="outline"
                  className={`${getStatusColor(employee.status)} capitalize`}
                >
                  {employee.status}
                </Badge>
                <span className="text-sm text-gray-600 font-mono">{employee.employee_id}</span>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              {employee.nationality && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Nationality</p>
                    <p className="text-sm font-medium">{employee.nationality}</p>
                  </div>
                </div>
              )}

              {employee.work_phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Work Phone</p>
                    <p className="text-sm font-medium">{employee.work_phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Employment Information</h4>
            <div className="grid grid-cols-2 gap-4">
              {employee.position && (
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Position</p>
                    <p className="text-sm font-medium">{employee.position}</p>
                  </div>
                </div>
              )}

              {employee.category && (
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="text-sm font-medium">{employee.category}</p>
                  </div>
                </div>
              )}

              {employee.date_of_joining && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Date of Joining</p>
                    <p className="text-sm font-medium">
                      {new Date(employee.date_of_joining).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}

              {employee.date_of_leaving && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Date of Leaving</p>
                    <p className="text-sm font-medium">
                      {new Date(employee.date_of_leaving).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Additional Information */}
          {employee.qualifications && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Qualifications</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">{employee.qualifications}</p>
              </div>
            </div>
          )}

          {/* System Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">System Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              {employee.created_at && (
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">
                    {new Date(employee.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {employee.updated_at && (
                <div>
                  <p className="text-gray-500">Last Updated</p>
                  <p className="font-medium">
                    {new Date(employee.updated_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};