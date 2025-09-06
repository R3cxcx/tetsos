import { useState, useEffect } from "react";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMasterData } from "@/hooks/useMasterData";
import { CreateDepartmentDialog } from "../components/CreateDepartmentDialog";
import { CreatePositionDialog } from "../components/CreatePositionDialog";
import { CreateNationalityDialog } from "../components/CreateNationalityDialog";
import { CreateCategoryDialog } from "../components/CreateCategoryDialog";
import { useRefresh } from '@/contexts/RefreshContext';

export const MasterDataIndex = () => {
  const { 
    departments, 
    positions, 
    employeeStatuses, 
    nationalities, 
    employeeCategories, 
    loading,
    importPositionsFromStaging,
    fetchMasterData
  } = useMasterData();
  const { setRefreshFunction } = useRefresh();

  const [showCreateDepartment, setShowCreateDepartment] = useState(false);
  const [showCreatePosition, setShowCreatePosition] = useState(false);
  const [showCreateNationality, setShowCreateNationality] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setRefreshFunction(() => fetchMasterData);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction, fetchMasterData]);

  const handleImportPositions = async () => {
    setImporting(true);
    await importPositionsFromStaging();
    setImporting(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading master data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Data Management</h1>
          <p className="text-muted-foreground">
            Manage departments, positions, nationalities, and employee categories
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Departments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">Departments</CardTitle>
              <CardDescription>
                {departments.length} active departments
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateDepartment(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {departments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">{dept.name}</div>
                    {dept.code && <div className="text-sm text-muted-foreground">{dept.code}</div>}
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Positions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">Positions</CardTitle>
              <CardDescription>
                {positions.length} active positions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleImportPositions}
                disabled={importing}
                variant="outline"
                className="h-8"
              >
                <Download className="h-4 w-4 mr-1" />
                {importing ? "Importing..." : "Import"}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreatePosition(true)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {positions.map((position) => (
                <div key={position.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">{position.title}</div>
                    {position.department && (
                      <div className="text-sm text-muted-foreground">{position.department.name}</div>
                    )}
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Employee Statuses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employee Status</CardTitle>
            <CardDescription>
              {employeeStatuses.length} status options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {employeeStatuses.map((status) => (
                <div key={status.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium capitalize">{status.status}</div>
                    {status.description && (
                      <div className="text-sm text-muted-foreground">{status.description}</div>
                    )}
                  </div>
                  <Badge variant="outline">System</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Nationalities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">Nationalities</CardTitle>
              <CardDescription>
                {nationalities.length} available nationalities
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateNationality(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {nationalities.map((nationality) => (
                <div key={nationality.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">{nationality.name}</div>
                    {nationality.code && (
                      <div className="text-sm text-muted-foreground">{nationality.code}</div>
                    )}
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Employee Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">Employee Categories</CardTitle>
              <CardDescription>
                {employeeCategories.length} category types
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateCategory(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {employeeCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="text-sm text-muted-foreground">{category.description}</div>
                    )}
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gender & Marital Status - System defined */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Options</CardTitle>
            <CardDescription>
              Built-in gender and marital status options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="font-medium mb-2">Gender Options:</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Male</Badge>
                  <Badge variant="secondary">Female</Badge>
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Marital Status:</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Single</Badge>
                  <Badge variant="secondary">Married</Badge>
                  <Badge variant="secondary">Divorced</Badge>
                  <Badge variant="secondary">Widowed</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateDepartmentDialog 
        open={showCreateDepartment}
        onOpenChange={setShowCreateDepartment}
      />
      <CreatePositionDialog 
        open={showCreatePosition}
        onOpenChange={setShowCreatePosition}
      />
      <CreateNationalityDialog 
        open={showCreateNationality}
        onOpenChange={setShowCreateNationality}
      />
      <CreateCategoryDialog 
        open={showCreateCategory}
        onOpenChange={setShowCreateCategory}
      />
    </div>
  );
};