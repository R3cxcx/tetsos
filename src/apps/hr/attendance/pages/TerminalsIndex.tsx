import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTerminals } from '@/hooks/useTerminals';
import { TerminalsList } from '../components/TerminalsList';
import { CreateTerminalDialog } from '../components/CreateTerminalDialog';

export default function TerminalsIndex() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: terminals, isLoading } = useTerminals();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Terminal Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage fingerprint terminals and devices
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Terminal
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terminals</CardTitle>
          </CardHeader>
          <CardContent>
            <TerminalsList terminals={terminals} isLoading={isLoading} />
          </CardContent>
        </Card>

        <CreateTerminalDialog 
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </div>
  );
}