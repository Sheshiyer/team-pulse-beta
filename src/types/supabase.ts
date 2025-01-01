import { Database } from "../lib/supabase/types";
export type SupabaseTimeEntry =
  Database["public"]["Tables"]["time_entries"]["Row"];
export type SupabaseEmployee = Database["public"]["Tables"]["employees"]["Row"];

export interface TimeEntry {
  id: string;
  employee_id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: string | null;
  billable: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CreateTimeEntry = Omit<TimeEntry, "id" | "created_at" | "updated_at">;
export type UpdateTimeEntry = TimeEntry;

export interface Employee {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  group?: string;
  employeeType?: "intern" | "fulltime" | "consultant";
}
