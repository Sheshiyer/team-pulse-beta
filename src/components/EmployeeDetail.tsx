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
import { Employee, TimeEntry } from "../types/clockify";
import { ClockifyService } from "../services/clockify";
import { HumanDesignService } from "../services/humanDesign";
import {
  calculateBiorhythm,
  getBiorhythmPhase,
  formatDuration,
  calculateTotalDuration,
} from "../utils/biorhythm";
import { EditEmployeeForm } from "./EditEmployeeForm";
import { saveEmployeeDetails } from "../utils/storage";
import { HumanDesign } from "../humanDesign";
import { HDProfile } from "../types/humanDesign";

interface Props {
  employee: Employee;
}

export function EmployeeDetail({ employee }: Props) {
  const [weeklyEntries, setWeeklyEntries] = useState<TimeEntry[]>([]);
  const [monthlyEntries, setMonthlyEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee>(employee);
  const [hdProfile, setHdProfile] = useState<HDProfile | null>(null);

  // Update currentEmployee when prop changes
  useEffect(() => {
    setCurrentEmployee(employee);

    // Load HD profile if available
    async function loadHDProfile() {
      if (employee.customDetails?.humanDesignType) {
        try {
          const hdService = HumanDesignService.getInstance();
          if (
            !employee.customDetails.dateOfBirth ||
            !employee.customDetails.timeOfBirth ||
            !employee.customDetails.location
          ) {
            return;
          }

          const response = await hdService.calculateProfile({
            date: employee.customDetails.dateOfBirth,
            time: `${employee.customDetails.timeOfBirth}:00`,
            location: {
              lat: employee.customDetails.location.latitude,
              lng: employee.customDetails.location.longitude,
              timezone: employee.customDetails.location.timezone,
            },
          });

          if (response.success && response.profile) {
            setHdProfile(response.profile);
          }
        } catch (error) {
          console.error("Error loading HD profile:", error);
        }
      }
    }

    loadHDProfile();
  }, [employee]);

  // Check active status every 30 seconds
  useEffect(() => {
    let isMounted = true;

    async function checkActiveStatus() {
      try {
        const clockify = ClockifyService.getInstance();
        const activeEntry = await clockify.getActiveTimeEntry(
          currentEmployee.id,
        );
        if (isMounted) {
          setIsActive(activeEntry !== null);
        }
      } catch (error) {
        console.error("Error checking active status:", error);
      }
    }

    // Initial check
    checkActiveStatus();

    // Set up polling interval
    const intervalId = setInterval(checkActiveStatus, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [currentEmployee.id]);

  useEffect(() => {
    let isMounted = true;

    async function fetchTimeEntries() {
      try {
        const clockify = ClockifyService.getInstance();
        const [weekly, monthly] = await Promise.all([
          clockify.getWeeklyTimeEntries(currentEmployee.id),
          clockify.getMonthlyTimeEntries(currentEmployee.id),
        ]);

        if (isMounted) {
          console.log("Weekly entries:", weekly); // Debug log
          setWeeklyEntries(weekly);
          setMonthlyEntries(monthly);
        }
      } catch (error) {
        console.error("Error fetching time entries:", error);
        if (isMounted) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load time entries",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTimeEntries();
    return () => {
      isMounted = false;
    };
  }, [currentEmployee.id]);

  const biorhythm =
    currentEmployee.customDetails?.dateOfBirth &&
    currentEmployee.customDetails?.timeOfBirth
      ? calculateBiorhythm(
          currentEmployee.customDetails.dateOfBirth,
          currentEmployee.customDetails.timeOfBirth,
        )
      : null;

  const weeklyDuration = calculateTotalDuration(weeklyEntries);
  const monthlyDuration = calculateTotalDuration(monthlyEntries);

  const markdown = `
# ${currentEmployee.name} ${currentEmployee.customDetails?.humanDesignType ? "✨" : ""}
${isActive ? "🟢 Active" : "⚫️ Inactive"} | ${currentEmployee.group || "No Group"}

## 👤 Profile Overview
${
  currentEmployee.customDetails?.humanDesignType
    ? `
✨ **Human Design Type**
   ${currentEmployee.customDetails.humanDesignType}

🎭 **Profile**
   ${currentEmployee.customDetails.profile || "Not set"}

🔮 **Incarnation Cross**
   ${currentEmployee.customDetails.incarnationCross || "Not set"}`
    : ""
}

## ⏰ Time Overview
📅 **This Week**
   ${formatDuration(weeklyDuration)}

📊 **This Month**
   ${formatDuration(monthlyDuration)}

${
  biorhythm
    ? `## 🌀 Current Biorhythm
┌─ 🏃‍♂️ Physical: ${getBiorhythmPhase(biorhythm.physical)} (${biorhythm.physical.toFixed(1)}%)
├─ 💫 Emotional: ${getBiorhythmPhase(biorhythm.emotional)} (${biorhythm.emotional.toFixed(1)}%)
└─ 🧠 Intellectual: ${getBiorhythmPhase(biorhythm.intellectual)} (${biorhythm.intellectual.toFixed(1)}%)`
    : ""
}

## 🕰️ Time Tracking Activity

${
  weeklyEntries.length > 0
    ? weeklyEntries
        .slice(0, 5)
        .map((entry) => {
          const start = new Date(entry.timeInterval.start);
          const end = new Date(entry.timeInterval.end);
          const duration = entry.timeInterval.duration
            .replace("PT", "")
            .replace("H", "h ")
            .replace("M", "m");
          const dayColor = start.getDay() === new Date().getDay() ? "🟢" : "⚪️";

          return `
### ${dayColor} ${start.toLocaleDateString("en-US", { weekday: "long" })} ${start.toLocaleDateString()}

⏰ **Work Session**
┌─ 🌅 Started: ${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
├─ ⌛️ Duration: ${duration}
└─ 🌙 Ended: ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}

${entry.description ? `📋 **Task Details**\n${entry.description}` : ""}
---`;
        })
        .join("\n")
    : "📭 No time entries recorded this week"
}
`;

  const handleEmployeeUpdate = (updatedEmployee: Employee) => {
    setCurrentEmployee(updatedEmployee);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <EditEmployeeForm
        employee={currentEmployee}
        onSave={handleEmployeeUpdate}
      />
    );
  }

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
            text={formatDuration(weeklyDuration)}
          />
          <Detail.Metadata.Label
            title="Monthly Hours"
            text={formatDuration(monthlyDuration)}
          />
          {currentEmployee.customDetails && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Birth Information">
                <Detail.Metadata.TagList.Item
                  text={currentEmployee.customDetails.dateOfBirth || "Not set"}
                  icon="🎂"
                  color={
                    currentEmployee.customDetails.dateOfBirth
                      ? Color.Green
                      : Color.SecondaryText
                  }
                />
                <Detail.Metadata.TagList.Item
                  text={currentEmployee.customDetails.timeOfBirth || "Not set"}
                  icon="⏰"
                  color={
                    currentEmployee.customDetails.timeOfBirth
                      ? Color.Green
                      : Color.SecondaryText
                  }
                />
              </Detail.Metadata.TagList>

              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="✨ Human Design Type"
                text={
                  currentEmployee.customDetails.humanDesignType || "Not set"
                }
                icon={{ source: Icon.Person, tintColor: Color.Purple }}
              />
              <Detail.Metadata.Label
                title="🎭 Profile"
                text={currentEmployee.customDetails.profile || "Not set"}
                icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
              />
              <Detail.Metadata.Label
                title="🔮 Incarnation Cross"
                text={
                  currentEmployee.customDetails.incarnationCross || "Not set"
                }
                icon={{ source: Icon.Circle, tintColor: Color.Blue }}
              />
              {currentEmployee.customDetails.location && (
                <>
                  <Detail.Metadata.Separator />
                  <Detail.Metadata.Label
                    title="📍 Location"
                    text={currentEmployee.customDetails.location.address}
                    icon={{ source: Icon.Pin, tintColor: Color.Red }}
                  />
                  <Detail.Metadata.Label
                    title="🌐 Timezone"
                    text={currentEmployee.customDetails.location.timezone}
                    icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                  />
                  <Detail.Metadata.TagList title="Coordinates">
                    <Detail.Metadata.TagList.Item
                      text={`${currentEmployee.customDetails.location.latitude.toFixed(4)}, ${currentEmployee.customDetails.location.longitude.toFixed(4)}`}
                      icon="🎯"
                      color={Color.Green}
                    />
                  </Detail.Metadata.TagList>
                </>
              )}
            </>
          )}
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
              content={`${currentEmployee.name} - ${formatDuration(weeklyDuration)} this week, ${formatDuration(monthlyDuration)} this month`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="✨ Human Design">
            {currentEmployee.customDetails?.humanDesignType && hdProfile && (
              <Action.Push
                title="View Human Design Details"
                icon={Icon.Eye}
                target={
                  <HumanDesign employee={currentEmployee} profile={hdProfile} />
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
