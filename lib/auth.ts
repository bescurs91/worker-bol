'use client';

import { supabase } from './supabase';

export async function getUserRole(userId: string): Promise<'user' | 'admin' | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

export async function signUp(email: string, password: string, role: 'user' | 'admin' = 'user') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data.user) {
    return { error };
  }

  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: data.user.id,
      role: role,
    });

  if (roleError) {
    return { error: roleError };
  }

  return { data, error: null };
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUserWithRole() {
  const user = await getCurrentUser();
  if (!user) return null;

  const role = await getUserRole(user.id);
  return { ...user, role };
}
