import { supabase } from './supabase';

export type AuditAction =
  | 'partial_payment_added'
  | 'full_completion_checked'
  | 'completion_unchecked'
  | 'amount_edited'
  | 'record_deleted'
  | 'record_created'
  | 'expense_marked_paid'
  | 'expense_marked_unpaid'
  | 'worker_created'
  | 'worker_updated'
  | 'worker_deleted';

export type RecordType = 'income' | 'expense' | 'worker';

interface AuditLogParams {
  actionType: AuditAction;
  recordType: RecordType;
  recordId: string;
  workerId?: string | null;
  performedBy: string;
  performedByRole: 'user' | 'admin';
  previousValue?: any;
  newValue?: any;
  reason?: string;
}

export async function createAuditLog({
  actionType,
  recordType,
  recordId,
  workerId,
  performedBy,
  performedByRole,
  previousValue,
  newValue,
  reason,
}: AuditLogParams) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      action_type: actionType,
      record_type: recordType,
      record_id: recordId,
      worker_id: workerId,
      performed_by: performedBy,
      performed_by_role: performedByRole,
      previous_value: previousValue,
      new_value: newValue,
      reason: reason,
    });

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (err) {
    console.error('Error creating audit log:', err);
  }
}

export async function getAuditLogs(filters?: {
  recordType?: RecordType;
  recordId?: string;
  workerId?: string;
  limit?: number;
}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.recordType) {
    query = query.eq('record_type', filters.recordType);
  }

  if (filters?.recordId) {
    query = query.eq('record_id', filters.recordId);
  }

  if (filters?.workerId) {
    query = query.eq('worker_id', filters.workerId);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  return await query;
}
