import { useState } from 'react';
import { Edit, Trash2, Wifi, Cable, Usb, Router } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Terminal, useDeleteTerminal } from '@/hooks/useTerminals';
import { EditTerminalDialog } from './EditTerminalDialog';

interface TerminalsListProps {
  terminals?: Terminal[];
  isLoading: boolean;
}

const getConnectionIcon = (method?: string) => {
  switch (method) {
    case 'wifi':
      return <Wifi className="h-4 w-4" />;
    case 'ethernet':
      return <Cable className="h-4 w-4" />;
    case 'usb':
      return <Usb className="h-4 w-4" />;
    case 'serial':
      return <Router className="h-4 w-4" />;
    default:
      return null;
  }
};

export function TerminalsList({ terminals, isLoading }: TerminalsListProps) {
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const deleteTerminal = useDeleteTerminal();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this terminal?')) {
      deleteTerminal.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading terminals...</div>;
  }

  if (!terminals || terminals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No terminals found. Add your first terminal to get started.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Terminal UID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Site Admin</TableHead>
            <TableHead>Connection</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {terminals.map((terminal) => (
            <TableRow key={terminal.id}>
              <TableCell className="font-mono text-sm">
                {terminal.terminal_uid}
              </TableCell>
              <TableCell className="font-medium">
                {terminal.terminal_name}
              </TableCell>
              <TableCell>{terminal.location || '-'}</TableCell>
              <TableCell>{terminal.site_admin_name || '-'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getConnectionIcon(terminal.connection_method)}
                  <span className="capitalize">
                    {terminal.connection_method || '-'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={terminal.is_active ? 'default' : 'secondary'}>
                  {terminal.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTerminal(terminal)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(terminal.id)}
                    disabled={deleteTerminal.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <EditTerminalDialog
        terminal={editingTerminal}
        open={!!editingTerminal}
        onOpenChange={(open) => !open && setEditingTerminal(null)}
      />
    </>
  );
}