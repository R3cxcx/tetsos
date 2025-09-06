import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Hash, RefreshCw, CheckCircle2, AlertTriangle, Edit3, Save, Plus, PlayCircle } from 'lucide-react';

interface Sequence {
  id?: string;
  key: string;
  description?: string | null;
  prefix: string;
  separator: string;
  padding: number;
  suffix: string;
  next_number: number;
  target_table?: string | null;
  target_column?: string | null;
  is_active: boolean;
}

interface ValidationResult {
  success: boolean;
  message?: string;
  key?: string;
  pattern?: string | null;
  total?: number;
  invalid_count?: number;
  duplicate_count?: number;
  invalid_samples?: string[];
  duplicate_samples?: { value: string; count: number }[];
}

const emptyForm: Sequence = {
  key: '',
  description: '',
  prefix: '',
  separator: '',
  padding: 4,
  suffix: '',
  next_number: 1,
  target_table: null,
  target_column: null,
  is_active: true,
};

export default function IdSequenceManagement() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(false);
  const [validatingKey, setValidatingKey] = useState<string | null>(null);
  const [form, setForm] = useState<Sequence>(emptyForm);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [showValidation, setShowValidation] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const loadSequences = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('id_sequences')
      .select('*')
      .order('key');

    if (error) {
      toast({ title: 'Error', description: 'Failed to load sequences', variant: 'destructive' });
    } else {
      setSequences(data as Sequence[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSequences();
  }, []);

  const preview = useMemo(() => {
    const num = Math.max(0, Number(form.next_number) || 0).toString().padStart(Math.max(0, Number(form.padding) || 0), '0');
    return `${form.prefix || ''}${form.separator || ''}${num}${form.suffix || ''}`;
  }, [form.prefix, form.separator, form.padding, form.suffix, form.next_number]);

  const onEdit = (seq: Sequence) => {
    setEditingId(seq.id);
    setForm({
      id: seq.id,
      key: seq.key,
      description: seq.description || '',
      prefix: seq.prefix || '',
      separator: seq.separator || '',
      padding: seq.padding ?? 4,
      suffix: seq.suffix || '',
      next_number: Number(seq.next_number) || 1,
      target_table: seq.target_table || null,
      target_column: seq.target_column || null,
      is_active: !!seq.is_active,
    });
  };

  const resetForm = () => {
    setEditingId(undefined);
    setForm(emptyForm);
  };

  const saveSequence = async () => {
    if (!form.key.trim()) {
      toast({ title: 'Validation', description: 'Key is required', variant: 'destructive' });
      return;
    }
    if ((form.padding as number) < 0 || (form.padding as number) > 12) {
      toast({ title: 'Validation', description: 'Padding must be between 0 and 12', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const payload: any = {
      key: form.key.trim().toLowerCase(),
      description: form.description || null,
      prefix: (form.prefix || '').toUpperCase(),
      separator: form.separator || '',
      padding: Number(form.padding) || 0,
      suffix: (form.suffix || '').toUpperCase(),
      next_number: Number(form.next_number) || 1,
      target_table: form.target_table || null,
      target_column: form.target_column || null,
      is_active: !!form.is_active,
    };

    let error;
    if (editingId) {
      const { error: e } = await (supabase as any)
        .from('id_sequences')
        .update(payload)
        .eq('id', editingId);
      error = e as any;
    } else {
      const { error: e } = await (supabase as any)
        .from('id_sequences')
        .insert(payload);
      error = e as any;
    }

    if (error) {
      toast({ title: 'Save failed', description: error.message || 'Could not save sequence', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Sequence saved successfully' });
      await loadSequences();
      resetForm();
    }
    setLoading(false);
  };

  const runValidation = async (key: string) => {
    setValidatingKey(key);
    const { data, error } = await (supabase as any).rpc('validate_sequence_ids', { p_key: key });
    setValidatingKey(null);
    if (error) {
      toast({ title: 'Validation error', description: error.message, variant: 'destructive' });
      return;
    }
    setValidation(data as ValidationResult);
    setShowValidation(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ID Sequences</h1>
        <p className="text-muted-foreground">Define formats and manage sequences for employees, requests, contracts, and more.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            {editingId ? 'Edit Sequence' : 'Create Sequence'}
          </CardTitle>
          <CardDescription>Configure prefix, number padding, and optional target for validation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input id="key" value={form.key} disabled={!!editingId}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase() }))}
                placeholder="employee | recruitment_request | contract" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefix</Label>
              <Input id="prefix" value={form.prefix}
                onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                placeholder="EMP" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="separator">Separator</Label>
              <Input id="separator" value={form.separator}
                onChange={(e) => setForm((f) => ({ ...f, separator: e.target.value }))}
                placeholder="- or / (optional)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="padding">Padding</Label>
              <Input id="padding" type="number" min={0} max={12} value={form.padding}
                onChange={(e) => setForm((f) => ({ ...f, padding: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="suffix">Suffix</Label>
              <Input id="suffix" value={form.suffix}
                onChange={(e) => setForm((f) => ({ ...f, suffix: e.target.value.toUpperCase() }))}
                placeholder="(optional)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next">Next number</Label>
              <Input id="next" type="number" min={0} value={form.next_number}
                onChange={(e) => setForm((f) => ({ ...f, next_number: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table">Target table</Label>
              <Input id="table" value={form.target_table ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, target_table: e.target.value || null }))}
                placeholder="employees, recruitment_requests..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="column">Target column</Label>
              <Input id="column" value={form.target_column ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, target_column: e.target.value || null }))}
                placeholder="employee_id, request_code..." />
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
            <div>
              <Label className="text-sm">Preview</Label>
              <div className="font-mono text-lg">{preview}</div>
            </div>
            <Badge variant={form.is_active ? 'default' : 'secondary'}>
              {form.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveSequence} disabled={loading} className="flex items-center gap-2">
              {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? 'Save Changes' : 'Create Sequence'}
            </Button>
            <Button variant="outline" onClick={resetForm}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Sequences</CardTitle>
          <CardDescription>Manage and validate your configured sequences.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">{sequences.length} sequence(s)</div>
            <Button variant="outline" onClick={loadSequences} disabled={loading} className="gap-2">
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
          </div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Next #</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((seq) => {
                  const sample = `${(seq.prefix || '').toUpperCase()}${seq.separator || ''}${String(seq.next_number || 0).padStart(seq.padding || 0, '0')}${(seq.suffix || '').toUpperCase()}`;
                  return (
                    <TableRow key={seq.key}>
                      <TableCell className="font-medium">{seq.key}</TableCell>
                      <TableCell className="font-mono">{sample}</TableCell>
                      <TableCell>{seq.next_number}</TableCell>
                      <TableCell>
                        {seq.target_table && seq.target_column ? (
                          <span className="text-sm text-muted-foreground">{seq.target_table}.{seq.target_column}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {seq.is_active ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => onEdit(seq)} className="gap-1">
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button size="sm" onClick={() => runValidation(seq.key)} disabled={validatingKey === seq.key || !seq.target_table || !seq.target_column} className="gap-1">
                            {validatingKey === seq.key ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <PlayCircle className="h-3.5 w-3.5" />
                            )}
                            Validate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sequences.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No sequences configured yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation Result</DialogTitle>
          </DialogHeader>
          {validation ? (
            <div className="space-y-3">
              {!validation.success && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{validation.message || 'Validation failed'}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Key</div>
                  <div className="font-medium">{validation.key}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pattern</div>
                  <div className="font-mono text-xs break-all bg-muted p-1 rounded">{validation.pattern || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-medium">{validation.total ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Invalid</div>
                  <div className="font-medium text-destructive">{validation.invalid_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Duplicates</div>
                  <div className="font-medium">{validation.duplicate_count ?? 0}</div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Invalid samples</div>
                <div className="flex flex-wrap gap-2">
                  {(validation.invalid_samples || []).length > 0 ? (
                    (validation.invalid_samples || []).map((s, i) => (
                      <Badge key={i} variant="secondary" className="font-mono">{s}</Badge>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" /> None
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Top duplicates</div>
                <div className="space-y-1">
                  {(validation.duplicate_samples || []).length > 0 ? (
                    (validation.duplicate_samples || []).map((d, i) => (
                      <div key={i} className="flex items-center justify-between border rounded px-2 py-1">
                        <span className="font-mono">{d.value}</span>
                        <Badge variant="outline">{d.count}</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" /> None
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
