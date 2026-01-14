'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Receipt, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  activeWorkers: number;
  outstandingDues: number;
  todayIncome: number;
  todayExpenses: number;
  weekIncome: number;
  weekExpenses: number;
  monthIncome: number;
  monthExpenses: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    activeWorkers: 0,
    outstandingDues: 0,
    todayIncome: 0,
    todayExpenses: 0,
    weekIncome: 0,
    weekExpenses: 0,
    monthIncome: 0,
    monthExpenses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const [workersRes, incomeRes, expensesRes, todayIncomeRes, todayExpensesRes, weekIncomeRes, weekExpensesRes, monthIncomeRes, monthExpensesRes, outstandingRes] =
        await Promise.all([
          supabase.from('workers').select('*', { count: 'exact' }).eq('status', 'active'),
          supabase.from('income_records').select('paid_amount'),
          supabase.from('expenses').select('amount').eq('is_paid', true),
          supabase.from('income_records').select('paid_amount').eq('date', today),
          supabase.from('expenses').select('amount').eq('date', today).eq('is_paid', true),
          supabase.from('income_records').select('paid_amount').gte('date', weekStart).lte('date', weekEnd),
          supabase.from('expenses').select('amount').gte('date', weekStart).lte('date', weekEnd).eq('is_paid', true),
          supabase.from('income_records').select('paid_amount').gte('date', monthStart).lte('date', monthEnd),
          supabase.from('expenses').select('amount').gte('date', monthStart).lte('date', monthEnd).eq('is_paid', true),
          supabase.from('income_records').select('remaining_balance').gt('remaining_balance', 0),
        ]);

      const totalIncome = incomeRes.data?.reduce((sum, record) => sum + Number(record.paid_amount), 0) || 0;
      const totalExpenses = expensesRes.data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const todayIncome = todayIncomeRes.data?.reduce((sum, record) => sum + Number(record.paid_amount), 0) || 0;
      const todayExpenses = todayExpensesRes.data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const weekIncome = weekIncomeRes.data?.reduce((sum, record) => sum + Number(record.paid_amount), 0) || 0;
      const weekExpenses = weekExpensesRes.data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const monthIncome = monthIncomeRes.data?.reduce((sum, record) => sum + Number(record.paid_amount), 0) || 0;
      const monthExpenses = monthExpensesRes.data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const outstandingDues = outstandingRes.data?.reduce((sum, record) => sum + Number(record.remaining_balance), 0) || 0;

      setStats({
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        activeWorkers: workersRes.count || 0,
        outstandingDues,
        todayIncome,
        todayExpenses,
        weekIncome,
        weekExpenses,
        monthIncome,
        monthExpenses,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your worker tracking system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWorkers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.netProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.outstandingDues > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-sm font-medium text-amber-900">Outstanding Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{formatCurrency(stats.outstandingDues)}</div>
            <p className="text-sm text-amber-600 mt-1">Total unpaid balance across all workers</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Income</span>
              <span className="font-semibold text-green-600">{formatCurrency(stats.todayIncome)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Expenses</span>
              <span className="font-semibold text-red-600">{formatCurrency(stats.todayExpenses)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-sm font-medium">Net</span>
              <span className={`font-bold ${(stats.todayIncome - stats.todayExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.todayIncome - stats.todayExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Income</span>
              <span className="font-semibold text-green-600">{formatCurrency(stats.weekIncome)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Expenses</span>
              <span className="font-semibold text-red-600">{formatCurrency(stats.weekExpenses)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-sm font-medium">Net</span>
              <span className={`font-bold ${(stats.weekIncome - stats.weekExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.weekIncome - stats.weekExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Income</span>
              <span className="font-semibold text-green-600">{formatCurrency(stats.monthIncome)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Expenses</span>
              <span className="font-semibold text-red-600">{formatCurrency(stats.monthExpenses)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-sm font-medium">Net</span>
              <span className={`font-bold ${(stats.monthIncome - stats.monthExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.monthIncome - stats.monthExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
