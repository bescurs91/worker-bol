'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { createAuditLog } from '@/lib/audit';

interface Worker {
  id: string;
  name: string;
  daily_income_amount: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', daily_income_amount: '' });
  const [submitting, setSubmitting] = useState(false);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkers(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch workers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (worker?: Worker) => {
    if (worker) {
      setEditingWorker(worker);
      setFormData({
        name: worker.name,
        daily_income_amount: worker.daily_income_amount.toString(),
      });
    } else {
      setEditingWorker(null);
      setFormData({ name: '', daily_income_amount: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const amount = parseFloat(formData.daily_income_amount);
      if (!formData.name || isNaN(amount) || amount < 0) {
        toast({
          title: 'Error',
          description: 'Please fill in all fields with valid values',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      if (editingWorker) {
        const { error } = await supabase
          .from('workers')
          .update({
            name: formData.name,
            daily_income_amount: amount,
          })
          .eq('id', editingWorker.id);

        if (error) throw error;

        await createAuditLog({
          actionType: 'worker_updated',
          recordType: 'worker',
          recordId: editingWorker.id,
          workerId: editingWorker.id,
          performedBy: user!.id,
          performedByRole: isAdmin ? 'admin' : 'user',
          previousValue: {
            name: editingWorker.name,
            daily_income_amount: editingWorker.daily_income_amount,
          },
          newValue: {
            name: formData.name,
            daily_income_amount: amount,
          },
        });

        toast({
          title: 'Success',
          description: 'Worker updated successfully',
        });
      } else {
        if (!isAdmin) {
          toast({
            title: 'Error',
            description: 'Only admins can create workers',
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }

        const { data, error } = await supabase
          .from('workers')
          .insert({
            name: formData.name,
            daily_income_amount: amount,
            status: 'active',
            created_by: user!.id,
          })
          .select();

        if (error) throw error;

        await createAuditLog({
          actionType: 'worker_created',
          recordType: 'worker',
          recordId: data?.[0]?.id,
          workerId: data?.[0]?.id,
          performedBy: user!.id,
          performedByRole: 'admin',
          newValue: {
            name: formData.name,
            daily_income_amount: amount,
          },
        });

        toast({
          title: 'Success',
          description: 'Worker created successfully',
        });
      }

      setDialogOpen(false);
      fetchWorkers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Operation failed',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (workerId: string) => {
    try {
      if (!isAdmin) {
        toast({
          title: 'Error',
          description: 'Only admins can delete workers',
          variant: 'destructive',
        });
        return;
      }

      const worker = workers.find(w => w.id === workerId);

      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', workerId);

      if (error) throw error;

      await createAuditLog({
        actionType: 'worker_deleted',
        recordType: 'worker',
        recordId: workerId,
        workerId: workerId,
        performedBy: user!.id,
        performedByRole: 'admin',
        previousValue: worker,
      });

      toast({
        title: 'Success',
        description: 'Worker deleted successfully',
      });

      fetchWorkers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete worker',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleStatus = async (worker: Worker) => {
    try {
      if (!isAdmin) {
        toast({
          title: 'Error',
          description: 'Only admins can change worker status',
          variant: 'destructive',
        });
        return;
      }

      const newStatus = worker.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('workers')
        .update({ status: newStatus })
        .eq('id', worker.id);

      if (error) throw error;

      await createAuditLog({
        actionType: 'worker_updated',
        recordType: 'worker',
        recordId: worker.id,
        workerId: worker.id,
        performedBy: user!.id,
        performedByRole: 'admin',
        previousValue: { status: worker.status },
        newValue: { status: newStatus },
      });

      toast({
        title: 'Success',
        description: `Worker status changed to ${newStatus}`,
      });

      fetchWorkers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Workers</h1>
          <p className="text-slate-500 mt-1">Manage worker profiles and daily income rates</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Worker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingWorker ? 'Edit Worker' : 'Add New Worker'}</DialogTitle>
                <DialogDescription>
                  {editingWorker ? 'Update worker details' : 'Create a new worker profile'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Worker Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter worker name"
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Daily Income Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.daily_income_amount}
                    onChange={(e) => setFormData({ ...formData, daily_income_amount: e.target.value })}
                    placeholder="0.00"
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingWorker ? 'Update' : 'Create'} Worker
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      ) : workers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No workers found. {isAdmin && 'Create one to get started.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workers.map((worker) => (
            <Card key={worker.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{worker.name}</h3>
                        <p className="text-sm text-slate-500">
                          Daily Income: ${worker.daily_income_amount.toFixed(2)}
                        </p>
                      </div>
                      <div
                        className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                          worker.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {worker.status === 'active' ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(worker)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={worker.status === 'active' ? 'outline' : 'ghost'}
                          size="sm"
                          onClick={() => handleToggleStatus(worker)}
                        >
                          {worker.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <AlertDialog open={deleteConfirm === worker.id} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteConfirm(worker.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Worker</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure? This will delete the worker and all associated records.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex gap-2">
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(worker.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
