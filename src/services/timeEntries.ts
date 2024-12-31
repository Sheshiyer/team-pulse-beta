import { ClockifyService } from './clockify';
import { SupabaseService } from './supabase';
import { TimeEntry } from '../types/clockify';
import * as supabaseClient from '../lib/supabase/client';

export class TimeEntriesService {
  private static instance: TimeEntriesService;
  private clockifyService: ClockifyService;
  private supabaseService: SupabaseService;

  private constructor() {
    this.clockifyService = ClockifyService.getInstance();
    this.supabaseService = SupabaseService.getInstance();
  }

  static getInstance(): TimeEntriesService {
    if (!TimeEntriesService.instance) {
      TimeEntriesService.instance = new TimeEntriesService();
    }
    return TimeEntriesService.instance;
  }

  async syncTimeEntries(employeeId: string, clockifyUserId: string): Promise<void> {
    try {
      console.log(`Syncing time entries for employee ${employeeId}`);
      
      // Get time entries from Clockify
      const timeEntries = await this.clockifyService.getWeeklyTimeEntries(clockifyUserId);
      
      for (const entry of timeEntries) {
        await this.upsertTimeEntry(employeeId, entry);
      }
      
      console.log(`Successfully synced ${timeEntries.length} time entries`);
    } catch (error) {
      console.error('Error syncing time entries:', error);
      throw error;
    }
  }

  private async upsertTimeEntry(employeeId: string, entry: TimeEntry): Promise<void> {
    const timeEntry = {
      employee_id: employeeId,
      clockify_entry_id: entry.id,
      description: entry.description,
      start_time: entry.timeInterval.start,
      end_time: entry.timeInterval.end || null,
      duration: entry.timeInterval.duration,
      billable: entry.billable
    };

    try {
      await supabaseClient.upsertTimeEntry(timeEntry);
    } catch (error) {
      console.error(`Error upserting time entry ${entry.id}:`, error);
      throw error;
    }
  }

  async syncAllEmployeesTimeEntries(): Promise<void> {
    try {
      const employees = await supabaseClient.getEmployees();
      
      if (!employees || employees.length === 0) {
        throw new Error('No active employees found');
      }

      for (const employee of employees) {
        if (employee.clockify_id) {
          await this.syncTimeEntries(employee.id, employee.clockify_id);
        }
      }
    } catch (error) {
      console.error('Error syncing all employees time entries:', error);
      throw error;
    }
  }
      const { data: employees } = await this.supabaseService.client
        .from('employees')
        .select('id, clockify_id')
        .eq('is_active', true);

      if (!employees) {
        throw new Error('No active employees found');
      }

      for (const employee of employees) {
        if (employee.clockify_id) {
          await this.syncTimeEntries(employee.id, employee.clockify_id);
        }
      }
    } catch (error) {
      console.error('Error syncing all employees time entries:', error);
      throw error;
    }
  }
}
