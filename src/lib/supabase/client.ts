import { createClient } from '@supabase/supabase-js';
import { Database } from './types';
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}

const preferences = getPreferenceValues<Preferences>();

// Create clients for different auth levels
const supabaseAdmin = createClient<Database>(
  preferences.supabaseUrl,
  preferences.supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false
    }
  }
);

const supabaseClient = createClient<Database>(
  preferences.supabaseUrl,
  preferences.supabaseAnonKey,
  {
    auth: {
      persistSession: false // Since this is a Raycast extension
    }
  }
);

// Type-safe helper functions using admin client for data operations
export const getEmployees = async () => {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*');
  
  if (error) throw error;
  return data;
};

export const getEmployee = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

export const updateEmployee = async (id: string, updates: Database['public']['Tables']['employees']['Update']) => {
  const { error } = await supabaseAdmin
    .from('employees')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
};

export const createEmployee = async (employee: Database['public']['Tables']['employees']['Insert']) => {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert([employee])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteEmployee = async (id: string) => {
  const { error } = await supabaseAdmin
    .from('employees')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Export the regular client for user-level operations
// Time entries operations
export const upsertTimeEntry = async (timeEntry: Database['public']['Tables']['time_entries']['Insert']) => {
  const { data: existingEntry } = await supabaseAdmin
    .from('time_entries')
    .select()
    .eq('clockify_entry_id', timeEntry.clockify_entry_id)
    .single();

  if (existingEntry) {
    const { error } = await supabaseAdmin
      .from('time_entries')
      .update(timeEntry)
      .eq('clockify_entry_id', timeEntry.clockify_entry_id);
    
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin
      .from('time_entries')
      .insert([timeEntry]);
    
    if (error) throw error;
  }
};

// Time entries operations
export const getTimeEntriesForEmployee = async (employeeId: string, startDate?: string, endDate?: string) => {
  let query = supabaseAdmin
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_time', { ascending: false });

  if (startDate) {
    query = query.gte('start_time', startDate);
  }
  if (endDate) {
    query = query.lte('start_time', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getActiveTimeEntry = async (employeeId: string) => {
  const { data, error } = await supabaseAdmin
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .is('end_time', null)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  return data || null;
};

export const supabase = supabaseClient;
