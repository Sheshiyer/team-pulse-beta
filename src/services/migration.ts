import { ClockifyService } from "./clockify";
import { SupabaseService } from "./supabase";
import { Employee } from "../types/clockify";

export class MigrationService {
  private static instance: MigrationService;
  private clockifyService: ClockifyService;
  private supabaseService: SupabaseService;

  private constructor() {
    this.clockifyService = ClockifyService.getInstance();
    this.supabaseService = SupabaseService.getInstance();
  }

  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  async syncEmployeeData(forceSync: boolean = false): Promise<void> {
    try {
      console.log("Starting employee sync...");

      // Get all users from Clockify
      const clockifyUsers = await this.clockifyService.getUsers();
      console.log(`Found ${clockifyUsers.length} users in Clockify`);

      // Get all employees from Supabase
      const existingEmployees = await this.supabaseService.getEmployees();
      console.log(`Found ${existingEmployees.length} employees in Supabase`);

      const existingEmails = new Set(existingEmployees.map((emp) => emp.email));
      const updatedCount = { created: 0, updated: 0, failed: 0 };

      // Process each Clockify user
      for (const user of clockifyUsers) {
        try {
          const existingEmployee = existingEmployees.find(
            (emp) => emp.email === user.email,
          );

          // Skip if employee exists and no force sync
          if (existingEmployee && !forceSync) {
            console.log(
              `Skipping ${user.email} - already exists and no force sync`,
            );
            continue;
          }

          // Get time entries and user groups
          const [timeEntries, groups] = await Promise.all([
            this.clockifyService.getWeeklyTimeEntries(user.id),
            this.clockifyService.getUserGroups(),
          ]);

          // Find user's group
          const userGroup = groups.find((group) =>
            group.userIds.includes(user.id),
          );

          // Convert Clockify time entries to daily logs
          const weeklyLogs = timeEntries.map((entry) => ({
            date: new Date(entry.timeInterval.start),
            loginTime: new Date(entry.timeInterval.start),
            logoutTime: new Date(
              entry.timeInterval.end || new Date().toISOString(),
            ),
          }));

          const employee: Omit<Employee, "id"> = {
            name: user.name,
            email: user.email,
            isActive: user.status === "ACTIVE",
            group: userGroup?.name,
            weeklyLogs,
            // Preserve existing custom details if the employee exists
            customDetails: existingEmails.has(user.email)
              ? existingEmployees.find((emp) => emp.email === user.email)
                  ?.customDetails
              : undefined,
          };

          if (existingEmployee) {
            await this.supabaseService.updateEmployee({
              ...existingEmployee,
              ...employee,
              id: existingEmployee.id,
            });
            updatedCount.updated++;
            console.log(`Updated employee: ${user.email}`);
          } else {
            await this.supabaseService.createEmployee(employee);
            updatedCount.created++;
            console.log(`Created employee: ${user.email}`);
          }
        } catch (error) {
          console.error(`Failed to process user ${user.email}:`, error);
          updatedCount.failed++;
        }
      }

      console.log("Employee sync completed:", updatedCount);
    } catch (error) {
      console.error("Error syncing employee data:", error);
      throw error;
    }
  }

  private syncIntervalId?: NodeJS.Timeout;

  async startPeriodicSync(intervalMinutes: number = 30): Promise<void> {
    if (this.syncIntervalId) {
      console.warn(
        "Periodic sync is already running. Stop it first to restart.",
      );
      return;
    }

    console.log(`Starting periodic sync every ${intervalMinutes} minutes`);

    // Do initial sync without force
    await this.syncEmployeeData(false);

    // Set up periodic sync with force update
    this.syncIntervalId = setInterval(
      async () => {
        try {
          await this.syncEmployeeData(true);
        } catch (error) {
          console.error("Error in periodic sync:", error);
        }
      },
      intervalMinutes * 60 * 1000,
    );
  }

  stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
      console.log("Periodic sync stopped");
    } else {
      console.warn("No periodic sync was running");
    }
  }
}
