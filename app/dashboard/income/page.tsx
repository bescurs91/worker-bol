'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { createAuditLog } from '@/lib/audit';

interface Worker {
  id: string;
  name: string;
  daily_income_amount: number;
  status: 'active' | 'inactive';
}

interface IncomeRecord {
  id: string;
  worker_id: string;
  date: string;
  expected_amount: number;
  paid_amount: number;
  remaining_balance: number;
  is_completed: boolean;
  notes: string | null;
  worker: Worker;
}

export default function IncomePage() {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [formData, setFormData] = useState({ date: format(new Date(), 'yyyy-MM-dd'), paid_amount: '' });
  const [submitting, setSubmitting] = useState(false);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workersRes, recordsRes] = await Promise.all([
        supabase.from('workers').select('*').eq('status', 'active'),
        supabase
          .from('income_records')
          .select('*, worker:workers(*)')
          .order('date', { ascending: false })
          .limit(100),
      ]);

      if (workersRes.error) throw workersRes.error;
      if (recordsRes.error) throw recordsRes.error;

      setWorkers(workersRes.data || []);
      setRecords(recordsRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!selectedWorker) {
        toast({
          title: 'Error',
          description: 'Please select a worker',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const worker = workers.find(w => w.id === selectedWorker);
      if (!worker) throw new Error('Worker not found');

      const paidAmount = parseFloat(formData.paid_amount) || 0;

      const { data, error } = await supabase
        .from('income_records')
        .upsert(
          {
            worker_id: selectedWorker,
            date: formData.date,
            expected_amount: worker.daily_income_amount,
            paid_amount: paidAmount,
            is_completed: paidAmount >= worker.daily_income_amount,
            completed_by: paidAmount >= worker.daily_income_amount ? user!.id : null,
            completed_at: paidAmount >= worker.daily_income_amount ? new Date().toISOString() : null,
          },
          { onConflict: 'worker_id,date' }
        )
        .select();

      if (error) throw error;

      await createAuditLog({
        actionType: 'partial_payment_added',
        recordType: 'income',
        recordId: data?.[0]?.id,
        workerId: selectedWorker,
        performedBy: user!.id,
        performedByRole: isAdmin ? 'admin' : 'user',
        newValue: {
          paid_amount: paidAmount,
          is_completed: paidAmount >= worker.daily_income_amount,
        },
      });

      toast({
        title: 'Success',
        description: 'Income record updated successfully',
      });

      setDialogOpen(false);
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), paid_amount: '' });
      setSelectedWorker('');
      fetchData();
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

  const handleToggleComplete = async (record: IncomeRecord) => {
    try {
      if (record.is_completed && !isAdmin) {
        toast({
          title: 'Error',
          description: 'Only admins can uncheck completed payments',
          variant: 'destructive',
        });
        return;
      }

      const newCompleted = !record.is_completed;
      const { error } = await supabase
        .from('income_records')
        .update({
          is_completed: newCompleted,
          completed_by: newCompleted ? user!.id : null,
          completed_at: newCompleted ? new Date().toISOString() : null,
        })
        .eq('id', record.id);

      if (error) throw error;

      await createAuditLog({
        actionType: newCompleted ? 'full_completion_checked' : 'completion_unchecked',
        recordType: 'income',
        recordId: record.id,
        workerId: record.worker_id,
        performedBy: user!.id,
        performedByRole: isAdmin ? 'admin' : 'user',
        previousValue: { is_completed: record.is_completed },
        newValue: { is_completed: newCompleted },
      });

      toast({
        title: 'Success',
        description: `Income record ${newCompleted ? 'completed' : 'uncompleted'}`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePayment = async (record: IncomeRecord, newAmount: string) => {
    try {
      if (record.is_completed && !isAdmin) {
        toast({
          title: 'Error',
          description: 'Only admins can edit completed payments',
          variant: 'destructive',
        });
        return;
      }

      const paidAmount = parseFloat(newAmount) || 0;
      const { error } = await supabase
        .from('income_records')
        .update({
          paid_amount: paidAmount,
          is_completed: paidAmount >= record.expected_amount,
          completed_by: paidAmount >= record.expected_amount ? user!.id : null,
          completed_at: paidAmount >= record.expected_amount ? new Date().toISOString() : null,
        })
        .eq('id', record.id);

      if (error) throw error;

      await createAuditLog({
        actionType: 'amount_edited',
        recordType: 'income',
        recordId: record.id,
        workerId: record.worker_id,
        performedBy: user!.id,
        performedByRole: isAdmin ? 'admin' : 'user',
        previousValue: { paid_amount: record.paid_amount },
        newValue: { paid_amount: paidAmount },
      });

      toast({
        title: 'Success',
        description: 'Payment updated',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Income Tracking</h1>
          <p className="text-slate-500 mt-1">Track daily income and partial payments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Income
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Income</DialogTitle>
              <DialogDescription>
                Add or update income payment for a worker
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="worker">Worker</Label>
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map(worker => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name} (${worker.daily_income_amount.toFixed(2)}/day)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount Paid</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.paid_amount}
                  onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                  placeholder="0.00"
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
                  Record Payment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No income records yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={record.is_completed}
                    onCheckedChange={() => handleToggleComplete(record)}
                    disabled={record.is_completed && !isAdmin}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{record.worker.name}</h3>
                        <p className="text-sm text-slate-500">
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          ${record.paid_amount.toFixed(2)} / ${record.expected_amount.toFixed(2)}
                        </div>
                        <div className={`text-sm ${record.remaining_balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {record.remaining_balance > 0
                            ? `${record.remaining_balance.toFixed(2)} remaining`
                            : 'Completed'}
                        </div>
                      </div>
                    </div>
                  </div>
                  {(isAdmin || !record.is_completed) && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={record.paid_amount}
                        className="w-24"
                        onBlur={(e) => handleUpdatePayment(record, e.currentTarget.value)}
                        disabled={record.is_completed && !isAdmin}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
