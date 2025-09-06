import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BulkUploadDialog from '../components/BulkUploadDialog';
import { useEmployees } from '@/hooks/useEmployees';

export default function DataUploadIndex() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { fetchEmployees } = useEmployees();

  const handleUploadSuccess = () => {
    fetchEmployees(); // Refresh the employees list
    setShowUploadDialog(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Data Management</h1>
          <p className="text-muted-foreground">
            Upload and manage employee data. Use the bulk upload feature to create new employees or update existing ones.
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Employee Data
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Bulk Upload
            </CardTitle>
            <CardDescription>
              Upload Excel or CSV files to create new employees or update existing employee data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => setShowUploadDialog(true)}
            >
              Start Upload
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Updates</CardTitle>
            <CardDescription>
              Employee records are automatically created or updated based on Employee ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>New Employee:</span>
                <span className="text-green-600">Creates record</span>
              </div>
              <div className="flex justify-between">
                <span>Existing ID:</span>
                <span className="text-blue-600">Updates record</span>
              </div>
              <div className="flex justify-between">
                <span>Duplicate ID:</span>
                <span className="text-red-600">Prevented</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>
              Download a template file with all required column headers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Use the template to ensure your data is formatted correctly before upload.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowUploadDialog(true)}
            >
              Get Template
            </Button>
          </CardContent>
        </Card>
      </div>

      <BulkUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}