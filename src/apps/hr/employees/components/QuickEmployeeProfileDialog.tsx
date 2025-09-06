import { Employee } from "@/hooks/useEmployees";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Calendar, User, Edit, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface QuickEmployeeProfileDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (employee: Employee) => void;
}

export const QuickEmployeeProfileDialog = ({ 
  employee, 
  open, 
  onOpenChange, 
  onEdit 
}: QuickEmployeeProfileDialogProps) => {
  const navigate = useNavigate();

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

  const handleViewFullProfile = () => {
    navigate(`/hr/employees/${employee.id}/profile`);
    onOpenChange(false);
  };

  const handleQuickEdit = () => {
    onEdit(employee);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src="" alt={employee.english_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(employee.english_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{employee.english_name}</h2>
              {employee.arabic_name && (
                <p className="text-sm text-muted-foreground" dir="rtl">{employee.arabic_name}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and ID */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge 
                variant="outline"
                className={`${getStatusColor(employee.status)} capitalize`}
              >
                {employee.status}
              </Badge>
              <span className="text-sm text-muted-foreground">ID: {employee.employee_id}</span>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employee.work_phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{employee.work_phone}</span>
              </div>
            )}

            {employee.nationality && (
              <div className="flex items-center space-x-3">
                <span className="h-4 w-4 flex items-center justify-center">🌍</span>
                <span className="text-sm">{employee.nationality}</span>
              </div>
            )}

            {employee.date_of_joining && (
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Joined: {new Date(employee.date_of_joining).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}</span>
              </div>
            )}

            {employee.category && (
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Category: {employee.category}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <Button variant="outline" onClick={handleQuickEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Quick Edit
            </Button>
            <Button onClick={handleViewFullProfile}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};