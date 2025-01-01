import { TimeEntriesService } from "../src/services/timeEntries";

async function testSync() {
  try {
    console.log("Starting time entries sync test...");
    const timeEntriesService = TimeEntriesService.getInstance();
    await timeEntriesService.syncAllEmployeesTimeEntries();
    console.log("Successfully completed sync test!");
  } catch (error) {
    console.error("Error during sync test:", error);
    process.exit(1);
  }
}

testSync();
