import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  showToast,
  Toast,
  LocalStorage,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Employee, TimeEntry } from "./types/clockify";
import { ClockifyService } from "./services/clockify";
import { TimeEntriesService } from "./services/timeEntries";
import { EmployeeDetail } from "./components/EmployeeDetail";
import { EditEmployeeForm } from "./components/EditEmployeeForm";
import {
  calculateTotalDuration,
  formatDuration,
  getRecommendedMonthlyHours,
} from "./utils/biorhythm";
import { getAllStoredEmployeeDetails } from "./utils/storage";

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

  // Function to clear cache and refresh data
  async function handleRefresh() {
    try {
      setIsLoading(true);
      // Only clear specific caches if needed, preserve employee details
      // await LocalStorage.clear(); // Removed complete clear
      
      // Reset states
      setEmployees([]);
      setWeeklyEntries({});
      setMonthlyEntries({});

      // Refetch all data
      const clockify = ClockifyService.getInstance();
      const workspaces = await clockify.getWorkspaces();
      await clockify.setActiveWorkspace(workspaces[0].id);

      const [users, groups] = await Promise.all([
        clockify.getUsers(),
        clockify.getUserGroups(),
      ]);

      // Map users to employees and check active timers
      const employeeList: Employee[] = await Promise.all(
        users
          .filter((user) => user.name)
          .map(async (user) => {
            const userGroup = groups.find((group) =>
              group.userIds.includes(user.id),
            );
            const activeEntry = await clockify.getActiveTimeEntry(user.id);

            // Get stored details to preserve location data
            const storedData = await LocalStorage.getItem<string>("employee_details");
            const storedDetails = storedData ? JSON.parse(storedData) : {};
            const employeeDetails = storedDetails[user.id] || {};

            return {
              id: user.id,
              name: user.name || "Unknown Employee",
              email: user.email || "",
              isActive: activeEntry !== null,
              group: userGroup?.name,
              weeklyLogs: [],
              customDetails: {
                ...employeeDetails,
                location: employeeDetails.location
              },
            };
          }),
      );

      if (employeeList.length === 0) {
        throw new Error("No employees found in Clockify workspace");
      }

      setEmployees(employeeList);

      // Fetch entries with delay to avoid rate limits
      const weeklyEntriesMap: Record<string, TimeEntry[]> = {};
      const monthlyEntriesMap: Record<string, TimeEntry[]> = {};

      for (const employee of employeeList) {
        try {
          const [weekly, monthly] = await Promise.all([
            clockify.getWeeklyTimeEntries(employee.id),
            clockify.getMonthlyTimeEntries(employee.id),
          ]);
          weeklyEntriesMap[employee.id] = weekly;
          monthlyEntriesMap[employee.id] = monthly;

          // Add delay between batches to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
        const clockify = ClockifyService.getInstance();
        const workspaces = await clockify.getWorkspaces();
        await clockify.setActiveWorkspace(workspaces[0].id);

        const [users, groups] = await Promise.all([
          clockify.getUsers(),
          clockify.getUserGroups(),
        ]);

        // Load stored employee details
        const storedDetails = await getAllStoredEmployeeDetails();

        // Map users to employees and check active timers
        const employeeList: Employee[] = await Promise.all(
          users
            .filter((user) => user.name)
            .map(async (user) => {
              const userGroup = groups.find((group) =>
                group.userIds.includes(user.id),
              );
              const storedEmployeeDetails = storedDetails[user.id];

              // Check for active timer
              const activeEntry = await clockify.getActiveTimeEntry(user.id);

              return {
                id: user.id,
                name: user.name || "Unknown Employee",
                email: user.email || "",
                isActive: activeEntry !== null, // Set active based on running timer
                group: userGroup?.name,
                weeklyLogs: [],
                customDetails: storedEmployeeDetails,
              };
            }),
        );

        if (employeeList.length === 0) {
          throw new Error("No employees found in Clockify workspace");
        }

        setEmployees(employeeList);

        // Fetch entries with delay to avoid rate limits
        const weeklyEntriesMap: Record<string, TimeEntry[]> = {};
        const monthlyEntriesMap: Record<string, TimeEntry[]> = {};

        for (const employee of employeeList) {
          try {
            const [weekly, monthly] = await Promise.all([
              clockify.getWeeklyTimeEntries(employee.id),
              clockify.getMonthlyTimeEntries(employee.id),
            ]);
            weeklyEntriesMap[employee.id] = weekly;
            monthlyEntriesMap[employee.id] = monthly;

            // Add delay between batches to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 1000));
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
        const clockify = ClockifyService.getInstance();
        const updatedEmployees = await Promise.all(
          employees.map(async (emp) => {
            try {
              const activeEntry = await clockify.getActiveTimeEntry(emp.id);
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
  }, [employees.length]); // Only re-run if number of employees changes

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
          description="Fetching data from Clockify..."
          icon={Icon.Clock}
        />
      ) : employees.length === 0 ? (
        <List.EmptyView
          title="No Employees Found"
          description="Could not find any employees in your Clockify workspace."
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
            const weeklyDuration = calculateTotalDuration(entries);

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
                    text: `${formatDuration(calculateTotalDuration(monthlyEntries[employee.id] || []))} / ${formatDuration(getRecommendedMonthlyHours() * 60)}`,
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
                        title="Sync Time Entries"
                        icon={Icon.Upload}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                        onAction={async () => {
                          try {
                            await showToast({
                              style: Toast.Style.Animated,
                              title: "Syncing time entries...",
                            });
                            
                            const timeEntriesService = TimeEntriesService.getInstance();
                            await timeEntriesService.syncTimeEntries(employee.id, employee.id);
                            
                            await showToast({
                              style: Toast.Style.Success,
                              title: "Time entries synced successfully",
                            });
                          } catch (error) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Failed to sync time entries",
                              message: error instanceof Error ? error.message : "Unknown error",
                            });
                          }
                        }}
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
                        content={`${employee.name} - ${formatDuration(weeklyDuration)} this week`}
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
