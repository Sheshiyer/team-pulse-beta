export function formatDuration(duration: string | null): string {
  if (!duration) return "0h 0m";

  try {
    // Handle "PT1H30M" format
    if (duration.startsWith("PT")) {
      const hours = duration.match(/(\d+)H/)?.[1] || "0";
      const minutes = duration.match(/(\d+)M/)?.[1] || "0";
      return `${hours}h ${minutes}m`;
    }

    // Handle "HH:mm:ss" format
    const [hours = "0", minutes = "0"] = duration.split(":");
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error("Error parsing duration:", error);
    return "0h 0m";
  }
}

export function calculateTotalHours(duration: string | null): number {
  if (!duration) return 0;

  try {
    // Handle "PT1H30M" format
    if (duration.startsWith("PT")) {
      const hours = parseInt(duration.match(/(\d+)H/)?.[1] || "0");
      const minutes = parseInt(duration.match(/(\d+)M/)?.[1] || "0");
      return hours + (minutes / 60);
    }

    // Handle "HH:mm:ss" format
    const [hours = "0", minutes = "0"] = duration.split(":");
    return parseInt(hours) + (parseInt(minutes) / 60);
  } catch (error) {
    console.error("Error calculating total hours:", error);
    return 0;
  }
}

export function getWorkingDaysInMonth(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let weekdays = 0;

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    // 0 is Sunday, 6 is Saturday
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      weekdays++;
    }
  }

  return weekdays;
}

export function getExpectedMonthlyHours(): number {
  return getWorkingDaysInMonth() * 8; // 8 hours per working day
}
