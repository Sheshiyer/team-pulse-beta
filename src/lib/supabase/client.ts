import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

let supabaseUrl: string;
let supabaseAnonKey: string;
let supabaseServiceRoleKey: string;

import { getPreferenceValues } from "@raycast/api";

try {
  // Try to get values from Raycast preferences
  const preferences = getPreferenceValues();
  supabaseUrl = preferences.supabaseUrl;
  supabaseAnonKey = preferences.supabaseAnonKey;
  supabaseServiceRoleKey = preferences.supabaseServiceRoleKey;
} catch (error) {
  // Fallback to environment variables
  supabaseUrl = process.env.SUPABASE_URL || "";
  supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase configuration. Set environment variables or Raycast preferences.",
  );
}

// Create clients for different auth levels
const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
    },
  },
);

const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// Type-safe helper functions using admin client for data operations
export const getEmployees = async () => {
  const { data, error } = await supabaseAdmin.from("employees").select("*");

  if (error) throw error;
  return data;
};

export const getEmployee = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const updateEmployee = async (
  id: string,
  updates: Database["public"]["Tables"]["employees"]["Update"],
) => {
  const { error } = await supabaseAdmin
    .from("employees")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
};

export const createEmployee = async (
  employee: Database["public"]["Tables"]["employees"]["Insert"],
) => {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .insert([employee])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEmployee = async (id: string) => {
  const { error } = await supabaseAdmin.from("employees").delete().eq("id", id);

  if (error) throw error;
};

// Export the regular client for user-level operations
// Time entries operations
export const upsertTimeEntry = async (timeEntry: TimeEntry) => {
  const { data: existingEntry } = await supabaseAdmin
    .from("time_entries")
    .select()
    .eq("id", timeEntry.id)
    .single();

  if (existingEntry) {
    const { error } = await supabaseAdmin
      .from("time_entries")
      .update({
        employee_id: timeEntry.employee_id,
        description: timeEntry.description,
        start_time: timeEntry.start_time,
        end_time: timeEntry.end_time,
        duration: timeEntry.duration,
        billable: timeEntry.billable,
      })
      .eq("id", timeEntry.id);

    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin
      .from("time_entries")
      .insert([{
        id: timeEntry.id,
        employee_id: timeEntry.employee_id,
        description: timeEntry.description,
        start_time: timeEntry.start_time,
        end_time: timeEntry.end_time,
        duration: timeEntry.duration,
        billable: timeEntry.billable,
      }]);

    if (error) throw error;
  }
};

// Time entries operations
import { TimeEntry } from "../../types/supabase";

export const getTimeEntriesForEmployee = async (
  employeeId: string,
  startDate?: string,
  endDate?: string,
): Promise<TimeEntry[]> => {
  let query = supabaseAdmin
    .from("time_entries")
    .select("*")
    .eq("employee_id", employeeId)
    .order("start_time", { ascending: false });

  if (startDate) {
    query = query.gte("start_time", startDate);
  }
  if (endDate) {
    query = query.lte("start_time", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
};

export const getActiveTimeEntry = async (
  employeeId: string,
): Promise<TimeEntry | null> => {
  const { data, error } = await supabaseAdmin
    .from("time_entries")
    .select("*")
    .eq("employee_id", employeeId)
    .is("end_time", null)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 is "no rows returned"
  return data || null;
};

export const supabase = supabaseClient;
