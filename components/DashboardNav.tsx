'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Users,
  DollarSign,
  Receipt,
  BarChart3,
  Shield,
  LogOut,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Workers', href: '/dashboard/workers', icon: Users },
  { name: 'Income', href: '/dashboard/income', icon: DollarSign },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
];

const adminNavigation = [
  { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: Shield },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
      {isAdmin &&
        adminNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
    </>
  );

  return (
    <>
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-slate-200 bg-white overflow-y-auto">
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-5 border-b border-slate-200">
            <h1 className="text-xl font-bold text-slate-900">Worker Tracker</h1>
          </div>
          <div className="flex-1 flex flex-col px-3 py-4 space-y-1">
            <NavLinks />
          </div>
          <div className="flex-shrink-0 flex border-t border-slate-200 p-4">
            <div className="flex-1 w-full">
              <div className="text-sm font-medium text-slate-900 truncate">
                {user?.email}
              </div>
              <div className="text-xs text-slate-500 capitalize">
                {isAdmin ? 'Admin' : 'User'}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Worker Tracker</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-5 border-b border-slate-200">
                <h1 className="text-xl font-bold text-slate-900">Worker Tracker</h1>
              </div>
              <div className="flex-1 flex flex-col px-3 py-4 space-y-1">
                <NavLinks />
              </div>
              <div className="flex-shrink-0 flex border-t border-slate-200 p-4">
                <div className="flex-1 w-full">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {user?.email}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">
                    {isAdmin ? 'Admin' : 'User'}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 justify-start"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
