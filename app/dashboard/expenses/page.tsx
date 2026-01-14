'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
}

interface Expense {
  id: string;
  worker_id: string;
  amount: number;
  category: string;
  description: string | null;
  expense_type: 'one_time' | 'recurring';
  recurrence_pattern: string | null;
  date: string;
  is_paid: boolean;
  worker: Worker;
}

const CATEGORIES = ['tools', 'transport', 'food', 'accommodation', 'equipment', 'other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: 'other',
    description: '',
    expense_type: 'one_time' as 'one_time' | 'recurring',
    recurrence_pattern: null as string | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workersRes, expensesRes] = await Promise.all([
        supabase.from('workers').select('id, name'),
        supabase
          .from('expenses')
          .select('*, worker:workers(id, name)')
          .order('date', { ascending: false })
          .limit(100),
      ]);

      if (workersRes.error) throw workersRes.error;
      if (expensesRes.error) throw expensesRes.error;

      setWorkers(workersRes.data || []);
      setExpenses(expensesRes.data || []);
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

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid amount',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          worker_id: selectedWorker,
          amount: amount,
          category: formData.category,
          description: formData.description || null,
          expense_type: formData.expense_type,
          recurrence_pattern: formData.expense_type === 'recurring' ? formData.recurrence_pattern : null,
          date: formData.date,
          is_paid: false,
        })
        .select();

      if (error) throw error;

      await createAuditLog({
        actionType: 'record_created',
        recordType: 'expense',
        recordId: data?.[0]?.id,
        workerId: selectedWorker,
        performedBy: user!.id,
        performedByRole: isAdmin ? 'admin' : 'user',
        newValue: {
          amount: amount,
          category: formData.category,
          expense_type: formData.expense_type,
        },
      });

      toast({
        title: 'Success',
        description: 'Expense recorded successfully',
      });

      setDialogOpen(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        category: 'other',
        description: '',
        expense_type: 'one_time',
        recurrence_pattern: null,
      });
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

  const handleTogglePaid = async (expense: Expense) => {
    try {
      if (expense.is_paid && !isAdmin) {
        toast({
          title: 'Error',
          description: 'Only admins can unmark paid expenses',
          variant: 'destructive',
        });
        return;
      }

      const newPaid = !expense.is_paid;
      const { error } = await supabase
        .from('expenses')
        .update({
          is_paid: newPaid,
          paid_by: newPaid ? user!.id : null,
          paid_at: newPaid ? new Date().toISOString() : null,
        })
        .eq('id', expense.id);

      if (error) throw error;

      await createAuditLog({
        actionType: newPaid ? 'expense_marked_paid' : 'expense_marked_unpaid',
        recordType: 'expense',
        recordId: expense.id,
        workerId: expense.worker_id,
        performedBy: user!.id,
        performedByRole: isAdmin ? 'admin' : 'user',
        previousValue: { is_paid: expense.is_paid },
        newValue: { is_paid: newPaid },
      });

      toast({
        title: 'Success',
        description: `Expense marked as ${newPaid ? 'paid' : 'unpaid'}`,
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
          <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500 mt-1">Track worker expenses and costs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Expense</DialogTitle>
              <DialogDescription>
                Add a new expense for a worker
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
                        {worker.name}
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
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add details"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.expense_type} onValueChange={(value: 'one_time' | 'recurring') => setFormData({ ...formData, expense_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-Time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.expense_type === 'recurring' && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence">Recurrence</Label>
                  <Select value={formData.recurrence_pattern || ''} onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  Add Expense
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
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No expenses recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {expenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={expense.is_paid}
                    onCheckedChange={() => handleTogglePaid(expense)}
                    disabled={expense.is_paid && !isAdmin}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{expense.worker.name}</h3>
                        <p className="text-sm text-slate-500">
                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)} • {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </p>
                        {expense.description && (
                          <p className="text-sm text-slate-600">{expense.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          ${expense.amount.toFixed(2)}
                        </div>
                        <div className={`text-sm ${expense.is_paid ? 'text-green-600' : 'text-amber-600'}`}>
                          {expense.is_paid ? 'Paid' : 'Pending'}
                        </div>
                        {expense.expense_type === 'recurring' && (
                          <div className="text-xs text-slate-500 capitalize">
                            {expense.recurrence_pattern}
                          </div>
                        )}
                      </div>
                    </div>
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
