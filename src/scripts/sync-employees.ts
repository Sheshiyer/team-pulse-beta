import { MigrationService } from '../services/migration';

async function main() {
  try {
    const migrationService = MigrationService.getInstance();
    
    // Start periodic sync every 30 minutes
    await migrationService.startPeriodicSync(30);
    
    console.log('Employee sync service started successfully');
    console.log('Press Ctrl+C to stop the sync service');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nStopping sync service...');
      migrationService.stopPeriodicSync();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start sync service:', error);
    process.exit(1);
  }
}

main();
