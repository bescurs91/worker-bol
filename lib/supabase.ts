import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      workers: {
        Row: {
          id: string;
          name: string;
          daily_income_amount: number;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          daily_income_amount: number;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          daily_income_amount?: number;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      income_records: {
        Row: {
          id: string;
          worker_id: string;
          date: string;
          expected_amount: number;
          paid_amount: number;
          remaining_balance: number;
          is_completed: boolean;
          notes: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          worker_id: string;
          date: string;
          expected_amount: number;
          paid_amount?: number;
          is_completed?: boolean;
          notes?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          worker_id?: string;
          date?: string;
          expected_amount?: number;
          paid_amount?: number;
          is_completed?: boolean;
          notes?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          worker_id: string;
          amount: number;
          category: string;
          description: string | null;
          expense_type: 'one_time' | 'recurring';
          recurrence_pattern: 'daily' | 'weekly' | 'monthly' | null;
          date: string;
          is_paid: boolean;
          paid_at: string | null;
          paid_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          worker_id: string;
          amount: number;
          category: string;
          description?: string | null;
          expense_type?: 'one_time' | 'recurring';
          recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | null;
          date: string;
          is_paid?: boolean;
          paid_at?: string | null;
          paid_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          worker_id?: string;
          amount?: number;
          category?: string;
          description?: string | null;
          expense_type?: 'one_time' | 'recurring';
          recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | null;
          date?: string;
          is_paid?: boolean;
          paid_at?: string | null;
          paid_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
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
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role: 'user' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
