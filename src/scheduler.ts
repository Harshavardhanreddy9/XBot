import dotenv from 'dotenv';
import { runXBot } from './index.js';

dotenv.config();

/**
 * Scheduler for automated bot runs
 */
class BotScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    console.log('⏰ XBot Scheduler Starting...');
    console.log('=============================\n');
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Scheduler started');

    // Run immediately on start
    this.runBot();

    // Schedule regular runs
    this.scheduleRuns();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('⏹️ Scheduler stopped');
  }

  /**
   * Schedule bot runs based on environment configuration
   */
  private scheduleRuns() {
    const runInterval = this.getRunInterval();
    
    console.log(`📅 Scheduling bot runs every ${runInterval} minutes`);
    
    this.intervalId = setInterval(() => {
      this.runBot();
    }, runInterval * 60 * 1000); // Convert minutes to milliseconds
  }

  /**
   * Get run interval from environment or default
   */
  private getRunInterval(): number {
    const interval = process.env.BOT_RUN_INTERVAL_MINUTES;
    
    if (interval) {
      const parsed = parseInt(interval, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // Default: run every 6 hours (360 minutes)
    return 360;
  }

  /**
   * Run the bot with error handling
   */
  private async runBot() {
    if (!this.isRunning) {
      return;
    }

    const now = new Date();
    console.log(`\n🤖 Running XBot at ${now.toISOString()}`);
    console.log('=====================================');

    try {
      await runXBot();
      console.log('✅ Bot run completed successfully');
    } catch (error) {
      console.error('❌ Bot run failed:', error);
      
      // Log error but don't crash the scheduler
      console.log('🔄 Scheduler will continue running...');
    }

    console.log(`⏰ Next run scheduled in ${this.getRunInterval()} minutes\n`);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      runInterval: this.getRunInterval(),
      nextRun: this.intervalId ? 'Scheduled' : 'Not scheduled'
    };
  }
}

// Create and start scheduler
const scheduler = new BotScheduler();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

// Start the scheduler
scheduler.start();

// Export for testing
export { BotScheduler };
