import { TimeEntry, CreateTimeEntry, UpdateTimeEntry } from "../types/supabase";
import * as supabaseClient from "../lib/supabase/client";

export class TimeEntriesService {
  private static instance: TimeEntriesService;

  private constructor() {}

  static getInstance(): TimeEntriesService {
    if (!TimeEntriesService.instance) {
      TimeEntriesService.instance = new TimeEntriesService();
    }
    return TimeEntriesService.instance;
  }

  async getTimeEntries(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TimeEntry[]> {
    try {
      return await supabaseClient.getTimeEntriesForEmployee(
        employeeId,
        startDate,
        endDate
      );
    } catch (error) {
      console.error("Error getting time entries:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to get time entries: ${error.message}`);
      }
      throw error;
    }
  }

  async getActiveTimeEntry(employeeId: string): Promise<TimeEntry | null> {
    try {
      return await supabaseClient.getActiveTimeEntry(employeeId);
    } catch (error) {
      console.error("Error getting active time entry:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to get active time entry: ${error.message}`);
      }
      throw error;
    }
  }

  async createTimeEntry(timeEntry: CreateTimeEntry): Promise<void> {
    try {
      await supabaseClient.upsertTimeEntry({
        ...timeEntry,
        id: crypto.randomUUID(), // Generate a new UUID for new entries
      });
    } catch (error) {
      console.error("Error creating time entry:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to create time entry: ${error.message}`);
      }
      throw error;
    }
  }

  async updateTimeEntry(timeEntry: UpdateTimeEntry): Promise<void> {
    try {
      await supabaseClient.upsertTimeEntry(timeEntry);
    } catch (error) {
      console.error("Error updating time entry:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to update time entry: ${error.message}`);
      }
      throw error;
    }
  }
}
