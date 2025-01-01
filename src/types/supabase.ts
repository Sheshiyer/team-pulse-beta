import { Database } from "../lib/supabase/types";
import { TimeEntry } from "./clockify";

export type SupabaseTimeEntry =
  Database["public"]["Tables"]["time_entries"]["Row"];
export type SupabaseEmployee = Database["public"]["Tables"]["employees"]["Row"];

export function adaptTimeEntry(entry: SupabaseTimeEntry): TimeEntry {
  return {
    id: entry.clockify_entry_id,
    description: entry.description || "",
    userId: entry.employee_id,
    billable: entry.billable,
    timeInterval: {
      start: entry.start_time,
      end: entry.end_time || "",
      duration: entry.duration || "PT0H0M",
    },
  };
}
