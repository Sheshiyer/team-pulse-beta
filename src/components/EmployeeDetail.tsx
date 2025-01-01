import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Employee, TimeEntry } from "../types/supabase";
import { TimeEntriesService } from "../services/timeEntries";
import { EditEmployeeForm } from "./EditEmployeeForm";
import { formatDuration, calculateTotalHours } from "../utils/time";

interface Props {
  employee: Employee;
}

export function EmployeeDetail({ employee }: Props) {
  const [weeklyEntries, setWeeklyEntries] = useState<TimeEntry[]>([]);
  const [monthlyEntries, setMonthlyEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee>(employee);

  // Update currentEmployee when prop changes
  useEffect(() => {
    setCurrentEmployee(employee);
  }, [employee]);

  // Check active status and fetch time entries
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const timeEntriesService = TimeEntriesService.getInstance();
        
        // Get active entry
        const activeEntry = await timeEntriesService.getActiveTimeEntry(currentEmployee.id);
        if (isMounted) {
          setIsActive(activeEntry !== null);
        }

        // Get weekly and monthly entries
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [weekly, monthly] = await Promise.all([
          timeEntriesService.getTimeEntries(
            currentEmployee.id,
            weekStart.toISOString(),
            new Date().toISOString()
          ),
          timeEntriesService.getTimeEntries(
            currentEmployee.id,
            monthStart.toISOString(),
            new Date().toISOString()
          ),
        ]);

        if (isMounted) {
          setWeeklyEntries(weekly);
          setMonthlyEntries(monthly);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (isMounted) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load data",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    // Set up polling interval for active status
    const intervalId = setInterval(fetchData, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [currentEmployee.id]);

  const weeklyHours = weeklyEntries.reduce(
    (total, entry) => total + calculateTotalHours(entry.duration),
    0
  );
  const monthlyHours = monthlyEntries.reduce(
    (total, entry) => total + calculateTotalHours(entry.duration),
    0
  );

  const markdown = `
# ${currentEmployee.name}
${isActive ? "🟢 Active" : "⚫️ Inactive"} | ${currentEmployee.group || "No Group"}

## ⏰ Time Overview
📅 **This Week**
   ${weeklyHours.toFixed(1)} hours

📊 **This Month**
   ${monthlyHours.toFixed(1)} hours

## 🕰️ Recent Time Entries

${
  weeklyEntries.length > 0
    ? weeklyEntries
        .slice(0, 5)
        .map((entry) => {
          const start = new Date(entry.start_time);
          const end = entry.end_time ? new Date(entry.end_time) : null;
          const duration = formatDuration(entry.duration);
          const dayColor = start.getDay() === new Date().getDay() ? "🟢" : "⚪️";

          return `
### ${dayColor} ${start.toLocaleDateString("en-US", { weekday: "long" })} ${start.toLocaleDateString()}

⏰ **Work Session**
┌─ 🌅 Started: ${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
├─ ⌛️ Duration: ${duration}
${end ? `└─ 🌙 Ended: ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : "└─ 🔄 In Progress"}

${entry.description ? `📋 **Task Details**\n${entry.description}` : ""}
---`;
        })
        .join("\n")
    : "📭 No time entries recorded this week"
}
`;

  const handleEmployeeUpdate = (updatedEmployee: Employee) => {
    setCurrentEmployee(updatedEmployee);
  };

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            icon={{
              source: Icon.Circle,
              tintColor: isActive ? Color.Green : Color.SecondaryText,
            }}
            text={isActive ? "Active" : "Inactive"}
          />
          <Detail.Metadata.Label
            title="Group"
            text={currentEmployee.group || "No Group"}
          />
          <Detail.Metadata.Label
            title="Type"
            icon={{ source: Icon.Person, tintColor: Color.Blue }}
            text={
              currentEmployee.employeeType
                ? currentEmployee.employeeType.charAt(0).toUpperCase() +
                  currentEmployee.employeeType.slice(1)
                : "Full Time"
            }
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Weekly Hours"
            text={`${weeklyHours.toFixed(1)}h`}
          />
          <Detail.Metadata.Label
            title="Monthly Hours"
            text={`${monthlyHours.toFixed(1)}h`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Employee Actions">
            <Action.Push
              title="Edit Employee"
              icon={Icon.Pencil}
              target={
                <EditEmployeeForm
                  employee={currentEmployee}
                  onSave={handleEmployeeUpdate}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.CopyToClipboard
              title="Copy Summary"
              content={`${currentEmployee.name} - ${weeklyHours.toFixed(1)}h this week, ${monthlyHours.toFixed(1)}h this month`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
