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
          clockify_entry_id: string;
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
          clockify_entry_id: string;
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
          clockify_entry_id?: string;
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
          // Core fields
          id: string;
          name: string;
          email: string;
          is_active: boolean;
          employee_type: "intern" | "fulltime" | "consultant" | null;
          group: string | null;

          // Clockify integration
          clockify_id: string | null;
          weekly_logs: Json | null;
          active_workspace: string | null;
          default_workspace: string | null;
          status: string | null;
          profile_picture: string | null;

          // Human Design fields
          birth_date: string | null;
          birth_time: string | null;
          birth_location: Json | null;
          hd_type: string | null;
          hd_authority: string | null;
          hd_profile: Json | null;
          hd_centers: Json | null;
          hd_gates: Json | null;
          hd_channels: Json | null;
          hd_definition: string | null;
          hd_incarnation_cross: string | null;
          hd_variables: Json | null;

          // Metadata
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
          clockify_id?: string | null;
          weekly_logs?: Json | null;
          active_workspace?: string | null;
          default_workspace?: string | null;
          status?: string | null;
          profile_picture?: string | null;
          birth_date?: string | null;
          birth_time?: string | null;
          birth_location?: Json | null;
          hd_type?: string | null;
          hd_authority?: string | null;
          hd_profile?: Json | null;
          hd_centers?: Json | null;
          hd_gates?: Json | null;
          hd_channels?: Json | null;
          hd_definition?: string | null;
          hd_incarnation_cross?: string | null;
          hd_variables?: Json | null;
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
          clockify_id?: string | null;
          weekly_logs?: Json | null;
          active_workspace?: string | null;
          default_workspace?: string | null;
          status?: string | null;
          profile_picture?: string | null;
          birth_date?: string | null;
          birth_time?: string | null;
          birth_location?: Json | null;
          hd_type?: string | null;
          hd_authority?: string | null;
          hd_profile?: Json | null;
          hd_centers?: Json | null;
          hd_gates?: Json | null;
          hd_channels?: Json | null;
          hd_definition?: string | null;
          hd_incarnation_cross?: string | null;
          hd_variables?: Json | null;
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
