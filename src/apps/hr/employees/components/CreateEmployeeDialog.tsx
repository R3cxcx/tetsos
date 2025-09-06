import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees, CreateEmployeeData } from "@/hooks/useEmployees";
import { toast } from "@/components/ui/use-toast";
import { validateEmployeeData, getFieldLabel } from "@/lib/employee-validation";
import { sanitizeInput } from "@/lib/input-sanitization";

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateEmployeeDialog = ({ open, onOpenChange }: CreateEmployeeDialogProps) => {
  const { createEmployee } = useEmployees();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Comprehensive validation using the enhanced validation library
    const validationErrors = validateEmployeeData(formData);
    
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
      const { error } = await createEmployee(formData);
      
      if (!error) {
        toast({
          title: "Success",
          description: "Employee created successfully",
        });
        onOpenChange(false);
        setFormData({
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
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create employee";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleInputChange = (field: keyof CreateEmployeeData, value: string) => {
    // Sanitize input to prevent XSS
    const sanitizedValue = sanitizeInput(value);
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Create a new employee record with basic information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                placeholder="EMP001"
                required
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Employee ID can only be set through Admin Settings → Employee ID Management
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
              <Label htmlFor="personal_email">Email</Label>
              <Input
                id="personal_email"
                type="email"
                value={formData.personal_email || ''}
                onChange={(e) => handleInputChange('personal_email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_phone">Work Phone</Label>
              <Input
                id="work_phone"
                value={formData.work_phone || ''}
                onChange={(e) => handleInputChange('work_phone', e.target.value)}
                placeholder="+1234567890"
              />
            </div>
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};