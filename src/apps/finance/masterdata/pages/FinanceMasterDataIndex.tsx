import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { useCostCenters } from '@/hooks/useCostCenters';
import { CreateCostCenterDialog } from '../components/CreateCostCenterDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function FinanceMasterDataIndex() {
  const { costCenters, loading, deleteCostCenter } = useCostCenters();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this cost center?')) {
      await deleteCostCenter(id);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Master Data</h1>
          <p className="text-muted-foreground">
            Manage cost centers and financial parameters
          </p>
        </div>
      </div>

      {/* Cost Centers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <div>
                <CardTitle>Cost Centers</CardTitle>
                <CardDescription>
                  Manage organizational cost centers for budget tracking
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cost Center
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : costCenters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cost centers found. Create your first cost center to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCenters.map((costCenter) => (
                    <TableRow key={costCenter.id}>
                      <TableCell className="font-medium">{costCenter.code}</TableCell>
                      <TableCell>{costCenter.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {costCenter.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={costCenter.is_active ? 'default' : 'secondary'}>
                          {costCenter.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement edit functionality
                              console.log('Edit cost center:', costCenter.id);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(costCenter.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Cost Center Dialog */}
      <CreateCostCenterDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}