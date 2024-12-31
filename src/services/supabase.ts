import { Employee, DailyLog, TimeEntry } from '../types/clockify';
import * as supabaseClient from '../lib/supabase/client';
import { Database } from '../lib/supabase/types';
import { Json } from '../lib/supabase/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface EmployeeCache {
  [key: string]: CacheEntry<Employee>;
}

export class SupabaseService {
  private static instance: SupabaseService;
  private employeeCache: EmployeeCache = {};

  private constructor() {}

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  private isCacheValid(cacheEntry: CacheEntry<any>): boolean {
    return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
  }

  private convertStoredLogsToDailyLogs(logs: unknown): DailyLog[] {
    if (!Array.isArray(logs)) return [];
    
    return logs.map(log => {
      if (typeof log !== 'object' || !log) return null;
      const typedLog = log as any;
      if (!typedLog.date || !typedLog.loginTime || !typedLog.logoutTime) return null;
      
      return {
        date: new Date(typedLog.date),
        loginTime: new Date(typedLog.loginTime),
        logoutTime: new Date(typedLog.logoutTime)
      };
    }).filter((log): log is DailyLog => log !== null);
  }

  private convertDailyLogsToJson(logs: DailyLog[]): Json {
    return logs.map(log => ({
      date: log.date.toISOString(),
      loginTime: log.loginTime.toISOString(),
      logoutTime: log.logoutTime.toISOString()
    }));
  }

  async getEmployees(): Promise<Employee[]> {
    try {
      const employees = await supabaseClient.getEmployees();
      return employees.map(emp => this.mapDatabaseToEmployee(emp));
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  private mapDatabaseToEmployee(emp: Database['public']['Tables']['employees']['Row']): Employee {
    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      isActive: emp.is_active,
      group: emp.group || undefined,
      weeklyLogs: this.convertStoredLogsToDailyLogs(emp.weekly_logs),
      employeeType: emp.employee_type || undefined,
      customDetails: {
        dateOfBirth: emp.birth_date || undefined,
        timeOfBirth: emp.birth_time || undefined,
        humanDesignType: emp.hd_type || undefined,
        profile: emp.hd_profile ? JSON.stringify(emp.hd_profile) : undefined,
        incarnationCross: emp.hd_incarnation_cross || undefined,
        location: emp.birth_location as {
          address: string;
          latitude: number;
          longitude: number;
          timezone: string;
        } || undefined
      }
    };
  }

  async getEmployee(id: string): Promise<Employee | null> {
    // Check cache first
    const cachedEntry = this.employeeCache[id];
    if (cachedEntry && this.isCacheValid(cachedEntry)) {
      return cachedEntry.data;
    }

    try {
      const employee = await supabaseClient.getEmployee(id);
      if (!employee) return null;

      const formattedEmployee = this.mapDatabaseToEmployee(employee);

      // Cache the result
      this.employeeCache[id] = {
        data: formattedEmployee,
        timestamp: Date.now()
      };

      return formattedEmployee;
    } catch (error) {
      console.error('Error fetching employee:', error);
      throw error;
    }
  }

  async updateEmployee(employee: Employee): Promise<void> {
    try {
      await supabaseClient.updateEmployee(employee.id, {
        name: employee.name,
        email: employee.email,
        is_active: employee.isActive,
        group: employee.group,
        weekly_logs: this.convertDailyLogsToJson(employee.weeklyLogs),
        employee_type: employee.employeeType,
        birth_date: employee.customDetails?.dateOfBirth,
        birth_time: employee.customDetails?.timeOfBirth,
        hd_type: employee.customDetails?.humanDesignType,
        hd_profile: employee.customDetails?.profile ? JSON.parse(employee.customDetails.profile) : null,
        hd_incarnation_cross: employee.customDetails?.incarnationCross,
        birth_location: employee.customDetails?.location || null
      });

      // Update cache
      this.employeeCache[employee.id] = {
        data: employee,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  async createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    try {
      const data = await supabaseClient.createEmployee({
        name: employee.name,
        email: employee.email,
        is_active: employee.isActive,
        group: employee.group,
        weekly_logs: this.convertDailyLogsToJson(employee.weeklyLogs),
        employee_type: employee.employeeType,
        birth_date: employee.customDetails?.dateOfBirth,
        birth_time: employee.customDetails?.timeOfBirth,
        hd_type: employee.customDetails?.humanDesignType,
        hd_profile: employee.customDetails?.profile ? JSON.parse(employee.customDetails.profile) : null,
        hd_incarnation_cross: employee.customDetails?.incarnationCross,
        birth_location: employee.customDetails?.location || null
      });

      const newEmployee = this.mapDatabaseToEmployee(data);

      // Cache the new employee
      this.employeeCache[data.id] = {
        data: newEmployee,
        timestamp: Date.now()
      };

      return newEmployee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  async updateDailyLogs(employeeId: string, logs: DailyLog[]): Promise<void> {
    try {
      await supabaseClient.updateEmployee(employeeId, {
        weekly_logs: this.convertDailyLogsToJson(logs)
      });

      // Update cache if it exists
      const cachedEntry = this.employeeCache[employeeId];
      if (cachedEntry) {
        cachedEntry.data.weeklyLogs = logs;
        cachedEntry.timestamp = Date.now();
      }
    } catch (error) {
      console.error('Error updating daily logs:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.employeeCache = {};
  }

  async getTimeEntries(employeeId: string, startDate?: string, endDate?: string): Promise<TimeEntry[]> {
    try {
      const entries = await supabaseClient.getTimeEntriesForEmployee(employeeId, startDate, endDate);
      return entries.map(entry => ({
        id: entry.clockify_entry_id,
        description: entry.description || '',
        userId: entry.employee_id,
        billable: entry.billable,
        timeInterval: {
          start: entry.start_time,
          end: entry.end_time || '',
          duration: entry.duration || 'PT0H0M'
        }
      }));
    } catch (error) {
      console.error('Error fetching time entries:', error);
      throw error;
    }
  }

  async getActiveTimeEntry(employeeId: string): Promise<TimeEntry | null> {
    try {
      const entry = await supabaseClient.getActiveTimeEntry(employeeId);
      if (!entry) return null;

      return {
        id: entry.clockify_entry_id,
        description: entry.description || '',
        userId: entry.employee_id,
        billable: entry.billable,
        timeInterval: {
          start: entry.start_time,
          end: entry.end_time || '',
          duration: entry.duration || 'PT0H0M'
        }
      };
    } catch (error) {
      console.error('Error fetching active time entry:', error);
      throw error;
    }
  }

  async getWeeklyTimeEntries(employeeId: string): Promise<TimeEntry[]> {
    const now = new Date();
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay()
    );
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + (6 - now.getDay())
    );
    endOfWeek.setHours(23, 59, 59, 999);

    return this.getTimeEntries(
      employeeId,
      startOfWeek.toISOString(),
      endOfWeek.toISOString()
    );
  }

  async getMonthlyTimeEntries(employeeId: string): Promise<TimeEntry[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.getTimeEntries(
      employeeId,
      startOfMonth.toISOString(),
      endOfMonth.toISOString()
    );
  }
}
