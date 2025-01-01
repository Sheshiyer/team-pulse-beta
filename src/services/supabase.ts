import { Employee, TimeEntry } from "../types/supabase";
import * as supabaseClient from "../lib/supabase/client";
import { Database } from "../lib/supabase/types";
import { Json } from "../lib/supabase/types";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

export class SupabaseService {
  private static instance: SupabaseService;

  private constructor() {}

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  async getEmployees(): Promise<Employee[]> {
    try {
      const employees = await supabaseClient.getEmployees();
      return employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        isActive: emp.is_active,
        group: emp.group || undefined,
        employeeType: emp.employee_type || "fulltime",
      }));
    } catch (error) {
      console.error("Error fetching employees:", error);
      throw error;
    }
  }

  async getEmployee(id: string): Promise<Employee | null> {
    try {
      const employee = await supabaseClient.getEmployee(id);
      if (!employee) return null;

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        isActive: employee.is_active,
        group: employee.group || undefined,
        employeeType: employee.employee_type || "fulltime",
      };
    } catch (error) {
      console.error("Error fetching employee:", error);
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
        employee_type: employee.employeeType,
      });
    } catch (error) {
      console.error("Error updating employee:", error);
      throw error;
    }
  }

  async createEmployee(employee: Omit<Employee, "id">): Promise<Employee> {
    try {
      const data = await supabaseClient.createEmployee({
        name: employee.name,
        email: employee.email,
        is_active: employee.isActive,
        group: employee.group,
        employee_type: employee.employeeType,
      });

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        isActive: data.is_active,
        group: data.group || undefined,
        employeeType: data.employee_type || "fulltime",
      };
    } catch (error) {
      console.error("Error creating employee:", error);
      throw error;
    }
  }

  async getTimeEntries(
    employeeId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<TimeEntry[]> {
    try {
      return await supabaseClient.getTimeEntriesForEmployee(
        employeeId,
        startDate,
        endDate,
      );
    } catch (error) {
      console.error("Error fetching time entries:", error);
      throw error;
    }
  }

  async getActiveTimeEntry(employeeId: string): Promise<TimeEntry | null> {
    try {
      return await supabaseClient.getActiveTimeEntry(employeeId);
    } catch (error) {
      console.error("Error fetching active time entry:", error);
      throw error;
    }
  }
}
