import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Hash, CheckCircle, XCircle, RefreshCw, Database } from 'lucide-react';

interface EmployeeIdValidationResult {
  id: string;
  exists: boolean;
  employee_name?: string;
}

export default function EmployeeIdManagement() {
  const [prefix, setPrefix] = useState('EMP');
  const [nextNumber, setNextNumber] = useState(1);
  const [padding, setPadding] = useState(4);
  const [validationIds, setValidationIds] = useState('');
  const [validationResults, setValidationResults] = useState<EmployeeIdValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState('');

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedPrefix = localStorage.getItem('employeeIdPrefix');
    const savedNextNumber = localStorage.getItem('employeeIdNextNumber');
    const savedPadding = localStorage.getItem('employeeIdPadding');

    if (savedPrefix) setPrefix(savedPrefix);
    if (savedNextNumber) setNextNumber(parseInt(savedNextNumber, 10));
    if (savedPadding) setPadding(parseInt(savedPadding, 10));
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('employeeIdPrefix', prefix);
    localStorage.setItem('employeeIdNextNumber', nextNumber.toString());
    localStorage.setItem('employeeIdPadding', padding.toString());
  }, [prefix, nextNumber, padding]);

  const generateEmployeeId = () => {
    const paddedNumber = nextNumber.toString().padStart(padding, '0');
    const newId = `${prefix}${paddedNumber}`;
    setGeneratedId(newId);
    setNextNumber(prev => prev + 1);
    
    toast({
      title: "Employee ID Generated",
      description: `Generated ID: ${newId}`,
    });
  };

  const validateEmployeeIds = async () => {
    if (!validationIds.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one Employee ID to validate",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const ids = validationIds.split('\n').map(id => id.trim()).filter(Boolean);
    const results: EmployeeIdValidationResult[] = [];

    try {
      for (const id of ids) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_id, english_name')
          .eq('employee_id', id)
          .maybeSingle();

        if (error) {
          console.error('Error validating ID:', error);
          results.push({ id, exists: false });
        } else {
          results.push({
            id,
            exists: !!data,
            employee_name: data?.english_name
          });
        }
      }

      setValidationResults(results);
      toast({
        title: "Validation Complete",
        description: `Validated ${results.length} Employee IDs`,
      });
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Failed to validate Employee IDs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const findNextAvailableId = async () => {
    setLoading(true);
    let currentNumber = nextNumber;
    let isAvailable = false;
    
    try {
      while (!isAvailable && currentNumber < 99999) {
        const paddedNumber = currentNumber.toString().padStart(padding, '0');
        const testId = `${prefix}${paddedNumber}`;
        
        const { data, error } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_id', testId)
          .maybeSingle();

        if (error) {
          console.error('Error checking ID:', error);
          break;
        }

        if (!data) {
          isAvailable = true;
          setNextNumber(currentNumber);
          const availableId = `${prefix}${paddedNumber}`;
          setGeneratedId(availableId);
          
          toast({
            title: "Next Available ID Found",
            description: `Next available ID: ${availableId}`,
          });
        } else {
          currentNumber++;
        }
      }

      if (!isAvailable) {
        toast({
          title: "No Available IDs",
          description: "Could not find an available ID with current settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to find next available ID",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee ID Management</h1>
        <p className="text-muted-foreground">
          Generate and validate employee IDs with customizable formats
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ID Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              ID Generator
            </CardTitle>
            <CardDescription>
              Configure and generate new employee IDs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefix</Label>
                <Input
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="EMP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="padding">Number Padding</Label>
                <Input
                  id="padding"
                  type="number"
                  min="1"
                  max="10"
                  value={padding}
                  onChange={(e) => setPadding(parseInt(e.target.value, 10) || 4)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextNumber">Next Number</Label>
              <Input
                id="nextNumber"
                type="number"
                min="1"
                value={nextNumber}
                onChange={(e) => setNextNumber(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Preview Format:</Label>
              <p className="text-lg font-mono">
                {prefix}{nextNumber.toString().padStart(padding, '0')}
              </p>
            </div>

            {generatedId && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <Label className="text-sm font-medium text-primary">Last Generated ID:</Label>
                <p className="text-lg font-mono text-primary">{generatedId}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={generateEmployeeId} className="flex-1">
                Generate ID
              </Button>
              <Button 
                variant="outline" 
                onClick={findNextAvailableId}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                Find Next Available
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ID Validator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              ID Validator
            </CardTitle>
            <CardDescription>
              Check if employee IDs already exist in the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="validationIds">Employee IDs (one per line)</Label>
              <textarea
                id="validationIds"
                className="w-full min-h-[120px] px-3 py-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={validationIds}
                onChange={(e) => setValidationIds(e.target.value)}
                placeholder="EMP0001&#10;EMP0002&#10;EMP0003"
              />
            </div>

            <Button 
              onClick={validateEmployeeIds} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Validate IDs'
              )}
            </Button>

            {validationResults.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Validation Results:</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {validationResults.map((result, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          {result.exists ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-mono text-sm">{result.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.exists ? (
                            <>
                              <Badge variant="destructive">Exists</Badge>
                              {result.employee_name && (
                                <span className="text-xs text-muted-foreground">
                                  {result.employee_name}
                                </span>
                              )}
                            </>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Available
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Employee IDs are <strong>read-only</strong> in the user interface and can only be modified directly in the database.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Always validate new IDs before manually inserting them into the database to avoid duplicates.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              The generator settings are saved locally and will persist between sessions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}