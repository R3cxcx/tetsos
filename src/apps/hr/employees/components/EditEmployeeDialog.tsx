import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees, CreateEmployeeData, Employee, EmployeeWithSensitiveData } from "@/hooks/useEmployees";
import type { EmployeeUpdateResult } from "@/types/employee";
import { toast } from "@/hooks/use-toast";
import { validateEmployeeData, getFieldLabel } from "@/lib/employee-validation";
import { sanitizeInput } from "@/lib/input-sanitization";
import { handleEmployeeUpdateResult, getErrorHandler } from "@/lib/employee-error-handling";

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | EmployeeWithSensitiveData | null;
  updateEmployeeFn?: (id: string, updates: Partial<CreateEmployeeData>) => Promise<EmployeeUpdateResult>; 
}

export const EditEmployeeDialog = ({ open, onOpenChange, employee, updateEmployeeFn }: EditEmployeeDialogProps) => {
  const { updateEmployee: updateEmployeeHook, fetchEmployeeWithSensitiveData } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateEmployeeData>({
    employee_id: '',
    english_name: '',
    arabic_name: '',
    position: '',
    category: 'Full-time',
    status: 'active',
    nationality: '',
    gender: 'male',
    marital_status: 'single',
    personal_email: '',
    work_phone: '',
    date_of_joining: '',
  });
  const [sensitiveEmployee, setSensitiveEmployee] = useState<EmployeeWithSensitiveData | null>(null);

  // Fetch sensitive data when dialog opens
  useEffect(() => {
    const loadSensitiveData = async () => {
      if (employee && open) {
        const sensitiveData = await fetchEmployeeWithSensitiveData(employee.id);
        setSensitiveEmployee(sensitiveData);
      }
    };
    
    loadSensitiveData();
  }, [employee, open, fetchEmployeeWithSensitiveData]);

  // Populate form when employee or sensitive data changes
  useEffect(() => {
    if (employee) {
      const sourceData = sensitiveEmployee || employee;
      
      setFormData({
        employee_id: employee.employee_id || '',
        english_name: employee.english_name || '',
        arabic_name: employee.arabic_name || '',
        position: sourceData.position || '', 
        category: employee.category || 'Full-time',
        status: (employee.status as "active" | "inactive" | "pending") || 'active',
        nationality: employee.nationality || '',
        gender: (sensitiveEmployee?.gender as "male" | "female") || 'male',
        marital_status: (sensitiveEmployee?.marital_status as "single" | "married" | "divorced" | "widowed") || 'single',
        personal_email: sensitiveEmployee?.personal_email || '',
        work_phone: employee.work_phone || '',
        home_phone: sensitiveEmployee?.home_phone || '',
        id_number: sensitiveEmployee?.id_number || '',
        birth_date: sensitiveEmployee?.birth_date || '',
        date_of_joining: employee.date_of_joining ? 
          (typeof employee.date_of_joining === 'string' ? 
            employee.date_of_joining : 
            new Date(employee.date_of_joining).toISOString().split('T')[0]) : '',
      });
    }
  }, [employee, sensitiveEmployee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee) return;

    // Validate for edit mode (more lenient)
    const validationErrors = validateEmployeeData(formData, true);
    
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => 
        `${getFieldLabel(err.field)}: ${err.message}`
      ).join('\n');
      
      toast({
        title: "Validation Error",
        description: errorMessages,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Prepare only changed fields compared against the best available source (sensitive data when loaded)
      const baseline = sensitiveEmployee ? { ...employee, ...sensitiveEmployee } : employee;
      const changedFields: Partial<CreateEmployeeData> = {};

      (Object.keys(formData) as (keyof CreateEmployeeData)[]).forEach((key) => {
        const value = formData[key] as string | undefined;
        const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;

        // Normalize baseline for comparison (dates as YYYY-MM-DD strings)
        let baselineValue = (baseline as any)[key];
        if (baselineValue instanceof Date) {
          baselineValue = baselineValue.toISOString().split('T')[0];
        }

        if (sanitizedValue !== baselineValue) {
          (changedFields as any)[key] = sanitizedValue === '' ? '' : sanitizedValue;
        }
      });

      // If no fields changed, just close the dialog
      if (Object.keys(changedFields).length === 0) {
        toast({
          title: "No Changes",
          description: "No fields were modified",
        });
        onOpenChange(false);
        setLoading(false);
        return;
      }

      const doUpdate = updateEmployeeFn ?? updateEmployeeHook;
      const result = await doUpdate(employee.id, changedFields);
      
      // Use enhanced error handling
      const success = handleEmployeeUpdateResult(
        result,
        "Employee updated successfully",
        () => onOpenChange(false)
      );

      if (!success) {
        console.error('Employee update failed:', result.error);
      }
    } catch (error: unknown) {
      const errorHandler = getErrorHandler(error);
      toast(errorHandler);
    }
    
    setLoading(false);
  };

  const handleInputChange = (field: keyof CreateEmployeeData, value: string) => {
    // Sanitize input to prevent XSS
    const sanitizedValue = sanitizeInput(value);
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update employee record information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                readOnly
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Employee ID is read-only and can only be modified directly in the database
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="english_name">English Name *</Label>
              <Input
                id="english_name"
                value={formData.english_name}
                onChange={(e) => handleInputChange('english_name', e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arabic_name">Arabic Name</Label>
              <Input
                id="arabic_name"
                value={formData.arabic_name || ''}
                onChange={(e) => handleInputChange('arabic_name', e.target.value)}
                placeholder="جون دو"
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position || ''}
                onChange={(e) => handleInputChange('position', e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality || ''}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
                placeholder="American"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marital_status">Marital Status</Label>
              <Select value={formData.marital_status} onValueChange={(value) => handleInputChange('marital_status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal_email">Email</Label>
              <Input
                id="personal_email"
                type="email"
                value={formData.personal_email || ''}
                onChange={(e) => handleInputChange('personal_email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="work_phone">Work Phone</Label>
              <Input
                id="work_phone"
                value={formData.work_phone || ''}
                onChange={(e) => handleInputChange('work_phone', e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_joining">Date of Joining</Label>
              <Input
                id="date_of_joining"
                type="date"
                value={formData.date_of_joining || ''}
                onChange={(e) => handleInputChange('date_of_joining', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};