import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Employee, TimeEntry } from "./types/supabase";
import { TimeEntriesService } from "./services/timeEntries";
import { EmployeeDetail } from "./components/EmployeeDetail";
import { EditEmployeeForm } from "./components/EditEmployeeForm";
import {
  formatDuration,
  calculateTotalHours,
  getExpectedMonthlyHours,
} from "./utils/time";
import { getAllStoredEmployeeDetails } from "./utils/storage";
import * as supabaseClient from "./lib/supabase/client";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface TimeEntriesCache {
  [key: string]: {
    weekly: TimeEntry[];
    monthly: TimeEntry[];
  };
}

export default function Command(): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyEntries, setWeeklyEntries] = useState<
    Record<string, TimeEntry[]>
  >({});
  const [monthlyEntries, setMonthlyEntries] = useState<
    Record<string, TimeEntry[]>
  >({});
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Cache helper functions
  async function getCachedData<T>(key: string): Promise<T | null> {
    const cached = await LocalStorage.getItem<string>(key);
    if (!cached) return null;

    const { data, timestamp }: CacheEntry<T> = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      await LocalStorage.removeItem(key);
      return null;
    }

    return data;
  }

  async function setCachedData<T>(key: string, data: T): Promise<void> {
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    await LocalStorage.setItem(key, JSON.stringify(cacheEntry));
  }

  // Function to get time entries for a date range
  async function getTimeEntriesForRange(
    employeeId: string,
    startDate: string,
    endDate: string,
    type: "weekly" | "monthly",
  ) {
    const cacheKey = "time_entries_cache";
    const cached = await getCachedData<TimeEntriesCache>(cacheKey);

    if (cached && cached[employeeId] && cached[employeeId][type]) {
      return cached[employeeId][type];
    }

    const entries = await supabaseClient.getTimeEntriesForEmployee(
      employeeId,
      startDate,
      endDate,
    );

    // Update cache
    const newCache: TimeEntriesCache = cached || {};
    if (!newCache[employeeId]) {
      newCache[employeeId] = { weekly: [], monthly: [] };
    }
    newCache[employeeId][type] = entries;
    await setCachedData(cacheKey, newCache);

    return entries;
  }

  // Function to clear cache and refresh data
  async function handleRefresh() {
    try {
      setIsLoading(true);

      // Clear time entries cache
      await LocalStorage.removeItem("time_entries_cache");

      // Reset states
      setWeeklyEntries({});
      setMonthlyEntries({});

      // Fetch employees from Supabase
      const employeeList = await supabaseClient.getEmployees();
      if (!employeeList || employeeList.length === 0) {
        throw new Error("No employees found in database");
      }

      // Load stored employee details
      const storedDetails = await getAllStoredEmployeeDetails();

      // Map employees and check active timers
      const mappedEmployees = await Promise.all(
        employeeList.map(async (emp) => {
          const activeEntry = await supabaseClient.getActiveTimeEntry(emp.id);
          const storedEmployeeDetails = storedDetails[emp.id];

          return {
            id: emp.id,
            name: emp.name || "Unknown Employee",
            email: emp.email || "",
            isActive: activeEntry !== null,
            group: emp.group || "No Group",
            employeeType: emp.employeeType || "fulltime",
          };
        }),
      );

      setEmployees(mappedEmployees);

      // Fetch time entries for each employee
      const weeklyEntriesMap: Record<string, TimeEntry[]> = {};
      const monthlyEntriesMap: Record<string, TimeEntry[]> = {};

      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      for (const employee of mappedEmployees) {
        try {
          const [weekly, monthly] = await Promise.all([
            getTimeEntriesForRange(
              employee.id,
              weekStart.toISOString(),
              new Date().toISOString(),
              "weekly",
            ),
            getTimeEntriesForRange(
              employee.id,
              monthStart.toISOString(),
              new Date().toISOString(),
              "monthly",
            ),
          ]);
          weeklyEntriesMap[employee.id] = weekly;
          monthlyEntriesMap[employee.id] = monthly;
        } catch (error) {
          console.error(`Error fetching entries for ${employee.name}:`, error);
          weeklyEntriesMap[employee.id] = [];
          monthlyEntriesMap[employee.id] = [];
        }
      }

      setWeeklyEntries(weeklyEntriesMap);
      setMonthlyEntries(monthlyEntriesMap);

      await showToast({
        style: Toast.Style.Success,
        title: "Data refreshed successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Initial data fetch
  useEffect(() => {
    async function fetchData() {
      try {
        // Try to get cached employees first
        const cachedEmployees = await getCachedData<Employee[]>("employees");
        if (cachedEmployees) {
          setEmployees(cachedEmployees);
          setIsLoading(false);
        }

        // Fetch fresh data
        const employeeList = await supabaseClient.getEmployees();
        if (!employeeList || employeeList.length === 0) {
          throw new Error("No employees found in database");
        }

        // Load stored employee details
        const storedDetails = await getAllStoredEmployeeDetails();

        // Map employees and check active timers
        const mappedEmployees = await Promise.all(
          employeeList.map(async (emp) => {
            const activeEntry = await supabaseClient.getActiveTimeEntry(emp.id);
            const storedEmployeeDetails = storedDetails[emp.id];

              return {
                id: emp.id,
                name: emp.name || "Unknown Employee",
                email: emp.email || "",
                isActive: activeEntry !== null,
                group: emp.group || "No Group",
                employeeType: emp.employeeType || "fulltime",
              };
          }),
        );

        // Cache the employees data
        await setCachedData("employees", mappedEmployees);
        setEmployees(mappedEmployees);

        // Fetch time entries for each employee
        const weeklyEntriesMap: Record<string, TimeEntry[]> = {};
        const monthlyEntriesMap: Record<string, TimeEntry[]> = {};

        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        for (const employee of mappedEmployees) {
          try {
            const [weekly, monthly] = await Promise.all([
              getTimeEntriesForRange(
                employee.id,
                weekStart.toISOString(),
                new Date().toISOString(),
                "weekly",
              ),
              getTimeEntriesForRange(
                employee.id,
                monthStart.toISOString(),
                new Date().toISOString(),
                "monthly",
              ),
            ]);
            weeklyEntriesMap[employee.id] = weekly;
            monthlyEntriesMap[employee.id] = monthly;
          } catch (error) {
            console.error(
              `Error fetching entries for ${employee.name}:`,
              error,
            );
            weeklyEntriesMap[employee.id] = [];
            monthlyEntriesMap[employee.id] = [];
          }
        }

        setWeeklyEntries(weeklyEntriesMap);
        setMonthlyEntries(monthlyEntriesMap);
        setIsLoading(false);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load employees",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    fetchData();
  }, []);

  // Poll for active status updates
  useEffect(() => {
    if (employees.length === 0) return;

    async function updateActiveStatus() {
      try {
        const updatedEmployees = await Promise.all(
          employees.map(async (emp) => {
            try {
              const activeEntry = await supabaseClient.getActiveTimeEntry(
                emp.id,
              );
              return { ...emp, isActive: activeEntry !== null };
            } catch (error) {
              console.error(`Error checking status for ${emp.name}:`, error);
              return emp;
            }
          }),
        );
        setEmployees(updatedEmployees);
      } catch (error) {
        console.error("Error updating active status:", error);
      }
    }

    // Initial check
    updateActiveStatus();

    // Set up polling interval
    const intervalId = setInterval(updateActiveStatus, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [employees.length]);

  function handleEmployeeUpdate(updatedEmployee: Employee) {
    setEmployees((current) =>
      current.map((emp) =>
        emp.id === updatedEmployee.id ? updatedEmployee : emp,
      ),
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search employees..."
      throttle
      searchBarAccessory={
        employees.length > 0 ? (
          <List.Dropdown
            tooltip="Filter by Status"
            storeValue={true}
            onChange={(newValue) => {
              setStatusFilter(newValue);
            }}
          >
            <List.Dropdown.Item title="All" value="all" />
            <List.Dropdown.Item title="Online" value="online" />
            <List.Dropdown.Item title="Offline" value="offline" />
          </List.Dropdown>
        ) : null
      }
    >
      {isLoading ? (
        <List.EmptyView
          title="Loading Employees"
          description="Fetching data from database..."
          icon={Icon.Clock}
        />
      ) : employees.length === 0 ? (
        <List.EmptyView
          title="No Employees Found"
          description="Could not find any employees in the database."
          icon={Icon.Person}
        />
      ) : (
        employees
          .filter((employee: Employee) => {
            if (!employee?.name) return false;
            switch (statusFilter) {
              case "online":
                return employee.isActive;
              case "offline":
                return !employee.isActive;
              default:
                return true;
            }
          })
          .map((employee: Employee) => {
            const entries = weeklyEntries[employee.id] || [];
            const weeklyHours = entries.reduce((total, entry) => 
              total + calculateTotalHours(entry.duration), 0);

            return (
              <List.Item
                key={employee.id}
                id={employee.id}
                title={employee.name}
                subtitle={employee.group || "No Group"}
                icon={{
                  source: employee.isActive ? Icon.CircleFilled : Icon.Circle,
                  tintColor: employee.isActive
                    ? Color.Green
                    : Color.SecondaryText,
                }}
                accessories={[
                  {
                    tag: {
                      value: employee.isActive ? "Active" : "Inactive",
                      color: employee.isActive
                        ? Color.Green
                        : Color.SecondaryText,
                    },
                  },
                  {
                    text: `${formatDuration(monthlyEntries[employee.id]?.[0]?.duration || "PT0H0M")} / ${getExpectedMonthlyHours()}h`,
                    tooltip: "Monthly hours / Recommended hours",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Eye}
                        target={<EmployeeDetail employee={employee} />}
                      />
                      <Action
                        title="Refresh Data"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={handleRefresh}
                      />
                      <Action.Push
                        title="Edit Employee"
                        icon={Icon.Pencil}
                        target={
                          <EditEmployeeForm
                            employee={employee}
                            onSave={handleEmployeeUpdate}
                          />
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Status"
                        content={`${employee.name} - ${weeklyHours.toFixed(1)}h this week`}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
                keywords={[
                  employee.isActive ? "active" : "inactive",
                  employee.group || "",
                  employee.email,
                ]}
              />
            );
          })
      )}
    </List>
  );
}
