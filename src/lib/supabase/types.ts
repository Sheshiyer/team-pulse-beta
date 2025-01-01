export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      time_entries: {
        Row: {
          id: string;
          employee_id: string;
          description: string | null;
          start_time: string;
          end_time: string | null;
          duration: string | null;
          billable: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          description?: string | null;
          start_time: string;
          end_time?: string | null;
          duration?: string | null;
          billable?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string | null;
          duration?: string | null;
          billable?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          name: string;
          email: string;
          is_active: boolean;
          employee_type: "intern" | "fulltime" | "consultant" | null;
          group: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          is_active?: boolean;
          employee_type?: "intern" | "fulltime" | "consultant" | null;
          group?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          is_active?: boolean;
          employee_type?: "intern" | "fulltime" | "consultant" | null;
          group?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
