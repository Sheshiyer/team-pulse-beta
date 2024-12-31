import { MigrationService } from '../services/migration';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSync() {
  try {
    const migrationService = MigrationService.getInstance();
    
    // Force sync to ensure we get fresh data
    await migrationService.syncEmployeeData(true);
    
    console.log('Sync test completed successfully');
  } catch (error) {
    console.error('Sync test failed:', error);
  }
}

// Run the sync test
testSync();
