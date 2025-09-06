import { useState, useEffect } from "react";
import { ArrowRight, Copy, Save, X, AlertTriangle, Edit2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { EmployeeStaging, useEmployeesStaging } from "@/hooks/useEmployeesStaging";
import { Employee, useEmployees, CreateEmployeeData } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmployeeData, getFieldLabel, ValidationError } from "@/lib/employee-validation";

interface StagingEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagingEmployee: EmployeeStaging | null;
  productionEmployee?: Employee | null;
}

export const StagingEmployeeDialog = ({ 
  open, 
  onOpenChange, 
  stagingEmployee,
  productionEmployee 
}: StagingEmployeeDialogProps) => {
  // All hooks must be called before any conditional returns
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const { updateStagingEmployee, promoteToProduction, deleteStagingEmployee } = useEmployeesStaging();
  const { updateEmployee, createEmployee } = useEmployees();
  const [editedData, setEditedData] = useState<Partial<EmployeeStaging>>({});
  const [productionFormData, setProductionFormData] = useState<Partial<CreateEmployeeData>>({});
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  const isSuperAdmin = hasRole('super_admin');

  const employeeFields = [
    { key: 'employee_id' as const, label: 'Employee ID', required: true },
    { key: 'english_name' as const, label: 'English Name', required: true },
    { key: 'arabic_name' as const, label: 'Arabic Name', required: false },
    { key: 'position' as const, label: 'Position', required: false },
    { key: 'status' as const, label: 'Status', required: false },
    { key: 'personal_email' as const, label: 'Personal Email', required: false },
    { key: 'work_phone' as const, label: 'Work Phone', required: false },
    { key: 'home_phone' as const, label: 'Home Phone', required: false },
    { key: 'nationality' as const, label: 'Nationality', required: false },
    { key: 'gender' as const, label: 'Gender', required: false },
    { key: 'marital_status' as const, label: 'Marital Status', required: false },
    { key: 'id_number' as const, label: 'ID Number', required: false },
    { key: 'issuing_body' as const, label: 'Issuing Body', required: false },
    { key: 'birth_place' as const, label: 'Birth Place', required: false },
    { key: 'birth_date' as const, label: 'Birth Date', required: false },
    { key: 'date_of_joining' as const, label: 'Date of Joining', required: false },
    { key: 'date_of_leaving' as const, label: 'Date of Leaving', required: false },
    { key: 'issue_date' as const, label: 'Issue Date', required: false },
    { key: 'category' as const, label: 'Category', required: false },
    { key: 'qualifications' as const, label: 'Qualifications', required: false },
    { key: 'nok_person' as const, label: 'NOK Person', required: false },
    { key: 'nok_name' as const, label: 'NOK Name', required: false },
    { key: 'nok_phone_number' as const, label: 'NOK Phone', required: false },
  ];

  // Helper function to map staging status to production status
  const mapStagingStatus = (stagingStatus: string | null): 'active' | 'inactive' | 'pending' => {
    if (!stagingStatus) return 'active';
    
    const status = stagingStatus.trim().toLowerCase();
    
    switch (status) {
      case 'left':
        return 'inactive';
      case 'yes':
      case 'active':
      case 'rehired':
        return 'active';
      case 'yet to join':
        return 'pending';
      default:
        return 'active'; // Default fallback
    }
  };

  // Initialize production form data with staging data on component mount
  useEffect(() => {
    if (!stagingEmployee) return;
    
    const formData: Partial<CreateEmployeeData> = {
      employee_id: stagingEmployee.employee_id || '',
      english_name: stagingEmployee.english_name || '',
      arabic_name: stagingEmployee.arabic_name || '',
      position: stagingEmployee.position || '',
      status: mapStagingStatus(stagingEmployee.status),
      personal_email: stagingEmployee.personal_email || '',
      work_phone: stagingEmployee.work_phone || '',
      home_phone: stagingEmployee.home_phone || '',
      nationality: stagingEmployee.nationality || '',
      gender: (stagingEmployee.gender === 'male' || stagingEmployee.gender === 'female') 
        ? stagingEmployee.gender 
        : undefined,
      marital_status: (['single', 'married', 'divorced', 'widowed'].includes(stagingEmployee.marital_status || ''))
        ? stagingEmployee.marital_status as 'single' | 'married' | 'divorced' | 'widowed'
        : undefined,
      id_number: stagingEmployee.id_number || '',
      issuing_body: stagingEmployee.issuing_body || '',
      birth_place: stagingEmployee.birth_place || '',
      // Only copy dates if they are valid
      birth_date: isDateField('birth_date') ? 
        (parseAndValidateDate(stagingEmployee.birth_date).isValid ? 
          parseAndValidateDate(stagingEmployee.birth_date).formattedDate || '' : '') : 
        (stagingEmployee.birth_date || ''),
      date_of_joining: isDateField('date_of_joining') ? 
        (parseAndValidateDate(stagingEmployee.date_of_joining).isValid ? 
          parseAndValidateDate(stagingEmployee.date_of_joining).formattedDate || '' : '') : 
        (stagingEmployee.date_of_joining || ''),
      date_of_leaving: isDateField('date_of_leaving') ? 
        (parseAndValidateDate(stagingEmployee.date_of_leaving).isValid ? 
          parseAndValidateDate(stagingEmployee.date_of_leaving).formattedDate || '' : '') : 
        (stagingEmployee.date_of_leaving || ''),
      issue_date: isDateField('issue_date') ? 
        (parseAndValidateDate(stagingEmployee.issue_date).isValid ? 
          parseAndValidateDate(stagingEmployee.issue_date).formattedDate || '' : '') : 
        (stagingEmployee.issue_date || ''),
      category: stagingEmployee.category || '',
      qualifications: stagingEmployee.qualifications || '',
      nok_person: stagingEmployee.nok_person || '',
      nok_name: stagingEmployee.nok_name || '',
      nok_phone_number: stagingEmployee.nok_phone_number || '',
    };
    
    setProductionFormData(formData);
  }, [stagingEmployee]);

  // Auto-copy production data to staging when valid and validate field types
  useEffect(() => {
    if (!productionEmployee || !stagingEmployee || !open) return;
    
    const warnings: Record<string, string> = {};
    const autoUpdates: Partial<EmployeeStaging> = {};
    
    employeeFields.forEach(field => {
      const stagingValue = stagingEmployee[field.key];
      const productionValue = productionEmployee[field.key as keyof Employee];
      
      // Check for data type mismatches or format issues in staging data
      if (stagingValue) {
        if (field.key.includes('date')) {
          const parsedDate = parseAndValidateDate(stagingValue);
          if (!parsedDate.isValid) {
            warnings[field.key] = 'Invalid date format in staging data';
            // Don't auto-copy invalid dates
          } else {
            // Auto-update production form with valid date
            setProductionFormData(prev => ({
              ...prev,
              [field.key]: parsedDate.formattedDate
            }));
          }
        } else if (field.key.includes('email')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(stagingValue))) {
            warnings[field.key] = 'Invalid email format';
            // Auto-copy valid production email if available
            if (productionValue && emailRegex.test(String(productionValue))) {
              autoUpdates[field.key] = String(productionValue);
            }
          } else {
            // Auto-update production form with valid email
            setProductionFormData(prev => ({
              ...prev,
              [field.key]: String(stagingValue)
            }));
          }
        } else {
          // Auto-update production form with other valid fields
          setProductionFormData(prev => ({
            ...prev,
            [field.key]: String(stagingValue)
          }));
        }
      } else if (productionValue) {
        // Auto-copy production data if staging field is empty
        autoUpdates[field.key] = String(productionValue);
        setProductionFormData(prev => ({
          ...prev,
          [field.key]: String(productionValue)
        }));
      }
      
      // Check required fields
      if (field.required && !stagingValue && !autoUpdates[field.key]) {
        warnings[field.key] = 'Required field is missing';
      }
    });
    
    setFieldWarnings(warnings);
    if (Object.keys(autoUpdates).length > 0) {
      setEditedData(prev => ({ ...prev, ...autoUpdates }));
    }
  }, [stagingEmployee, productionEmployee, open]);

  // Helper function to parse and validate dates
  const parseAndValidateDate = (dateStr: string | null): { isValid: boolean; formattedDate: string | null } => {
    if (!dateStr || dateStr === 'null' || dateStr === 'undefined' || dateStr.trim() === '') {
      return { isValid: false, formattedDate: null };
    }
    
    // If it's already a valid ISO date format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        return { isValid: true, formattedDate: dateStr };
      }
    }
    
    // Try to parse other date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return { isValid: true, formattedDate: date.toISOString().split('T')[0] };
    }
    
    return { isValid: false, formattedDate: null };
  };

  // Helper to check if a field is a date field
  const isDateField = (fieldKey: string): boolean => {
    return fieldKey.includes('date');
  };

  const handleFieldChange = (field: keyof EmployeeStaging, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (Object.keys(editedData).length === 0) {
      toast({
        title: "No changes",
        description: "No changes to save",
      });
      return;
    }

    await updateStagingEmployee(stagingEmployee.id, editedData);
    setEditedData({});
  };

  const handlePromoteToProduction = async () => {
    // Validate production form data before promoting
    const errors = validateEmployeeData(productionFormData);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: `Please fix ${errors.length} validation error(s) before promoting`,
        variant: "destructive",
      });
      return;
    }

    // Clean up data - convert empty strings to null for date fields
    const cleanedData: Partial<CreateEmployeeData> = { ...productionFormData };
    const dateFields = ['date_of_joining', 'date_of_leaving', 'birth_date', 'issue_date'];
    
    dateFields.forEach(field => {
      if (cleanedData[field] === '') {
        cleanedData[field] = null;
      }
    });

    // Create employee with cleaned production form data
    const result = await createEmployee(cleanedData as CreateEmployeeData);
    
    if (result.error === null) {
      // Delete from staging after successful promotion
      await deleteStagingEmployee(stagingEmployee.id);
      toast({
        title: "Success",
        description: "Employee promoted to production and removed from staging",
      });
      onOpenChange(false);
    }
  };

  const handleProductionFormChange = (field: keyof CreateEmployeeData, value: string) => {
    setProductionFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation errors for this field when user starts typing
    setValidationErrors(prev => prev.filter(error => error.field !== field));
  };

  const getDisplayValue = (field: keyof EmployeeStaging) => {
    return editedData[field] ?? stagingEmployee[field] ?? '';
  };

  const getProductionFormValue = (field: keyof CreateEmployeeData) => {
    return productionFormData[field] ?? '';
  };

  // Early return after all hooks are called
  if (!stagingEmployee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Review Staging Employee: {stagingEmployee?.english_name || 'Unknown'}
              </DialogTitle>
              <DialogDescription>
                Compare staging data with production and make corrections before promoting
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Staging
              </Badge>
              {productionEmployee && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Has Production
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Warnings Section */}
        {Object.keys(fieldWarnings).length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="font-medium mb-2">Data Validation Issues:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {Object.entries(fieldWarnings).map(([field, warning]) => (
                  <li key={field}>
                    <strong>{employeeFields.find(f => f.key === field)?.label}:</strong> {warning}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Production Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-2">Production Data Validation Errors:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationErrors.map((error, index) => (
                  <li key={index}>
                    <strong>{getFieldLabel(error.field)}:</strong> {error.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid gap-4">
            {employeeFields.map((field) => {
              const hasWarning = fieldWarnings[field.key];
              const hasValidationError = validationErrors.some(error => error.field === field.key);
              const borderColor = hasWarning ? "border-l-red-200" : hasValidationError ? "border-l-red-300" : "border-l-blue-200";
              
              return (
              <Card key={field.key} className={`border-l-4 ${borderColor}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {field.label}
                      {(hasWarning || hasValidationError) && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    </div>
                    {field.required && <span className="text-red-500 text-xs">*Required</span>}
                  </CardTitle>
                  {hasWarning && (
                    <p className="text-xs text-red-600 mt-1">{hasWarning}</p>
                  )}
                  {hasValidationError && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.find(error => error.field === field.key)?.message}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                    {/* Staging Data (Editable) */}
                    <div className="space-y-2">
                      <Label className="text-xs text-orange-600 font-medium">Staging Data</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type={isDateField(field.key) ? "date" : "text"}
                          value={getDisplayValue(field.key)}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className={`flex-1 ${hasWarning && isDateField(field.key) ? 'border-red-300 bg-red-50 focus:border-red-400' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>

                    {/* Production Data (Editable) */}
                    <div className="space-y-2">
                      <Label className="text-xs text-green-600 font-medium">Production Data (Editable)</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type={isDateField(field.key) ? "date" : "text"}
                          value={String(getProductionFormValue(field.key as keyof CreateEmployeeData))}
                          onChange={(e) => handleProductionFormChange(field.key as keyof CreateEmployeeData, e.target.value)}
                          placeholder={`Edit ${field.label.toLowerCase()}`}
                          className={`flex-1 ${hasValidationError ? 'border-red-300 focus:border-red-400' : 'border-green-200 focus:border-green-400'}`}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleSave} disabled={Object.keys(editedData).length === 0}>
                <Save className="h-4 w-4 mr-2" />
                Save Staging Changes
              </Button>
              {Object.keys(editedData).length > 0 && (
                <span className="text-sm text-orange-600">You have unsaved staging changes</span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handlePromoteToProduction} 
                className="bg-green-600 hover:bg-green-700"
                disabled={!productionFormData.employee_id || !productionFormData.english_name || validationErrors.length > 0}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Promote to Production & Delete from Staging
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};