'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AuditLog {
  id: string;
  action_type: string;
  record_type: 'income' | 'expense' | 'worker';
  record_id: string;
  worker_id: string | null;
  performed_by: string;
  performed_by_role: 'user' | 'admin';
  previous_value: any;
  new_value: any;
  reason: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  'partial_payment_added': 'Partial Payment Added',
  'full_completion_checked': 'Marked Completed',
  'completion_unchecked': 'Marked Incomplete',
  'amount_edited': 'Amount Edited',
  'record_deleted': 'Record Deleted',
  'record_created': 'Record Created',
  'expense_marked_paid': 'Marked as Paid',
  'expense_marked_unpaid': 'Marked as Unpaid',
  'worker_created': 'Worker Created',
  'worker_updated': 'Worker Updated',
  'worker_deleted': 'Worker Deleted',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRecordType, setFilterRecordType] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only admins can view audit logs',
        variant: 'destructive',
      });
      return;
    }
    fetchAuditLogs();
  }, [isAdmin, filterRecordType, filterAction]);

  const fetchAuditLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterRecordType) {
        query = query.eq('record_type', filterRecordType);
      }

      if (filterAction) {
        query = query.eq('action_type', filterAction);
      }

      const { data, error } = await query.limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('deleted')) return 'text-red-600 bg-red-50';
    if (action.includes('unchecked') || action.includes('unpaid')) return 'text-amber-600 bg-amber-50';
    if (action.includes('marked') || action.includes('completed')) return 'text-green-600 bg-green-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'text-red-600' : 'text-slate-600';
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-300 mb-4" />
            <p className="text-slate-900 font-semibold">Access Denied</p>
            <p className="text-slate-500 text-sm mt-1">Only admins can view audit logs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500 mt-1">View all system activity and changes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Filter by Record Type</label>
          <Select value={filterRecordType} onValueChange={setFilterRecordType}>
            <SelectTrigger>
              <SelectValue placeholder="All records" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All records</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="worker">Worker</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Filter by Action</label>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([key]) => (
                <SelectItem key={key} value={key}>
                  {ACTION_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No audit logs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="border-slate-200">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}>
                          {ACTION_LABELS[log.action_type] || log.action_type}
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize`}>
                          {log.record_type}
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleColor(log.performed_by_role) === 'text-red-600' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {log.performed_by_role === 'admin' && <ShieldAlert className="h-3 w-3" />}
                          {log.performed_by_role === 'admin' ? 'Admin' : 'User'}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Record ID: <span className="font-mono text-xs text-slate-500">{log.record_id.slice(0, 8)}...</span>
                      </p>
                      {log.reason && (
                        <p className="text-sm text-slate-600 mt-1">
                          Reason: <span className="italic text-slate-700">{log.reason}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {format(new Date(log.created_at), 'MMM dd, yyyy')}
                      <br />
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </div>
                  </div>

                  {(log.previous_value || log.new_value) && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
                      {log.previous_value && (
                        <div>
                          <p className="font-medium text-slate-700 mb-1">Before:</p>
                          <pre className="bg-white p-2 rounded border border-slate-200 overflow-x-auto text-slate-600">
                            {JSON.stringify(log.previous_value, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_value && (
                        <div>
                          <p className="font-medium text-slate-700 mb-1">After:</p>
                          <pre className="bg-white p-2 rounded border border-slate-200 overflow-x-auto text-slate-600">
                            {JSON.stringify(log.new_value, null, 2)}
                          </pre>
                        </div>
                      )}
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
