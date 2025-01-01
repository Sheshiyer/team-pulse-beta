interface BiorhythmCycle {
  physical: number;
  emotional: number;
  intellectual: number;
}

export function calculateBiorhythm(
  dateOfBirth: string,
  timeOfBirth: string,
): BiorhythmCycle {
  const birthDate = new Date(`${dateOfBirth}T${timeOfBirth}`);
  const today = new Date();
  const daysSinceBirth = Math.floor(
    (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    physical: Math.sin((2 * Math.PI * daysSinceBirth) / 23) * 100,
    emotional: Math.sin((2 * Math.PI * daysSinceBirth) / 28) * 100,
    intellectual: Math.sin((2 * Math.PI * daysSinceBirth) / 33) * 100,
  };
}

export function getBiorhythmPhase(value: number): string {
  if (value > 90) return "Peak";
  if (value > 30) return "High";
  if (value > -30) return "Transition";
  if (value > -90) return "Low";
  return "Critical";
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function getRecommendedMonthlyHours(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Get the number of weekdays (Mon-Fri) in the current month
  const lastDay = new Date(year, month + 1, 0).getDate();
  let weekdays = 0;

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    // 0 is Sunday, 6 is Saturday
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      weekdays++;
    }
  }

  // Calculate total recommended hours (8 hours per weekday)
  return weekdays * 8;
}

export function calculateTotalDuration(
  timeEntries: Array<{
    timeInterval?: { duration: string };
    duration?: string;
  }>,
): number {
  return timeEntries.reduce((total, entry) => {
    // Handle Supabase format (direct duration string)
    if (entry.duration) {
      try {
        // Handle "PT1H30M" format
        if (entry.duration.startsWith("PT")) {
          const hours = entry.duration.match(/(\d+)H/)?.[1] || "0";
          const minutes = entry.duration.match(/(\d+)M/)?.[1] || "0";
          return total + (parseInt(hours) * 60 + parseInt(minutes));
        }

        // Handle "HH:mm:ss" format
        const [hours = "0", minutes = "0"] = entry.duration.split(":");
        return total + (parseInt(hours) * 60 + parseInt(minutes));
      } catch (error) {
        console.error("Error parsing duration:", error);
        return total;
      }
    }

    // Handle Clockify format (timeInterval.duration)
    if (entry.timeInterval?.duration) {
      try {
        // Handle "PT1H30M" format
        if (entry.timeInterval.duration.startsWith("PT")) {
          const hours = entry.timeInterval.duration.match(/(\d+)H/)?.[1] || "0";
          const minutes =
            entry.timeInterval.duration.match(/(\d+)M/)?.[1] || "0";
          return total + (parseInt(hours) * 60 + parseInt(minutes));
        }

        // Handle "HH:mm:ss" format
        const [hours = "0", minutes = "0"] =
          entry.timeInterval.duration.split(":");
        return total + (parseInt(hours) * 60 + parseInt(minutes));
      } catch (error) {
        console.error("Error parsing duration:", error);
        return total;
      }
    }

    return total;
  }, 0);
}
