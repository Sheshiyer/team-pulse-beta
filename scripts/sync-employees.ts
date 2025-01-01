import { ClockifyService } from "../src/services/clockify";
import * as supabaseClient from "../src/lib/supabase/client";
import { v4 as uuidv4 } from 'uuid';

async function syncEmployees() {
  try {
    console.log("Starting employee sync...");
    
    // Get Clockify users
    const clockifyService = ClockifyService.getInstance();
    const users = await clockifyService.getUsers();
    
    console.log(`Found ${users.length} users in Clockify`);
    
    // Sync each user to Supabase
    for (const user of users) {
      if (user.status === "ACTIVE") {
        try {
          const newEmployee = {
            id: uuidv4(),
            name: user.name,
            email: user.email,
            clockify_id: user.id,
            status: "ACTIVE"
          };
          await supabaseClient.createEmployee(newEmployee);
          console.log(`Synced employee: ${user.name}`);
        } catch (error) {
          // If employee already exists, update them
          const { data: existingEmployees } = await supabaseClient.supabase
            .from('employees')
            .select()
            .eq('clockify_id', user.id);
            
          if (existingEmployees && existingEmployees.length > 0) {
            await supabaseClient.updateEmployee(existingEmployees[0].id, {
              name: user.name,
              email: user.email,
              status: "ACTIVE"
            });
            console.log(`Updated employee: ${user.name}`);
          } else {
            console.error(`Error syncing employee ${user.name}:`, error);
          }
        }
      }
    }
    
    console.log("Employee sync completed!");
  } catch (error) {
    console.error("Error syncing employees:", error);
    process.exit(1);
  }
}

syncEmployees();
