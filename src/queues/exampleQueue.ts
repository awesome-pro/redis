import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import redisClient from '../config/redis';

// Create a queue instance with advanced options
export const exampleQueue = new Queue('example-queue', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 1000, // Initial delay of 1 second
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,    // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Create a worker to process jobs with advanced features
const worker = new Worker('example-queue', async (job) => {
  console.log('Processing job:', job.id);
  console.log('Job data:', job.data);
  
  // Implement different job types
  switch (job.name) {
    case 'process-job':
      return await processRegularJob(job);
    case 'scheduled-job':
      return await processScheduledJob(job);
    case 'periodic-job':
      return await processPeriodicJob(job);
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}, {
  connection: redisClient,
  concurrency: 5, // Process up to 5 jobs simultaneously
  limiter: {
    max: 100,    // Maximum number of jobs processed
    duration: 1000 // Per second (rate limiting)
  },
});

// Queue events for monitoring
const queueEvents = new QueueEvents('example-queue', {
  connection: redisClient,
});

// Event handlers
queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed with result:`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`Job ${jobId} failed with reason:`, failedReason);
});

queueEvents.on('delayed', ({ jobId, delay }) => {
  console.log(`Job ${jobId} has been delayed by ${delay}ms`);
});

// Job processors
async function processRegularJob(job: Job<any, any, string>) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { processed: true, jobId: job.id };
}

async function processScheduledJob(job: Job<any, any, string>) {
  console.log(`Executing scheduled job ${job.id} at ${new Date()}`);
  return { scheduled: true, executedAt: new Date() };
}

async function processPeriodicJob(job: Job<any, any, string>) {
  console.log(`Executing periodic job ${job.id}`);
  return { periodic: true, executedAt: new Date() };
}

// Helper functions for adding different types of jobs
export const queueHelpers = {
  // Add a delayed job
  async addDelayedJob(data: any, delayInMs: number) {
    return await exampleQueue.add('scheduled-job', data, {
      delay: delayInMs,
      timestamp: Date.now() + delayInMs // Add timestamp for tracking
    });
  },

  // Add a job for specific time
  async scheduleJobForTime(data: any, executeAt: Date) {
    const delay = executeAt.getTime() - Date.now();
    if (delay < 0) {
      throw new Error('Cannot schedule job in the past');
    }
    return await exampleQueue.add('scheduled-job', data, {
      delay,
      timestamp: executeAt.getTime()
    });
  },

  // Add a recurring job (every minute)
  async addRecurringJob(data: any) {
    return await exampleQueue.add('periodic-job', data, {
      repeat: {
        every: 60000, // Every minute
        limit: 100    // Optional: limit the number of repetitions
      },
      timestamp: Date.now()
    });
  },

  // Add a cron job (specific schedule)
  async addCronJob(data: any, cronExpression: string) {
    return await exampleQueue.add('periodic-job', data, {
      repeat: {
        pattern: cronExpression, // e.g., '0 * * * *' for every hour
        tz: 'Asia/Kolkata'      // Use local timezone
      },
      timestamp: Date.now()
    });
  },

  // Get all delayed jobs
  async getDelayedJobs() {
    return await exampleQueue.getDelayed();
  },

  // Get all recurring jobs
  async getRepeatableJobs() {
    return await exampleQueue.getRepeatableJobs();
  },

  // Remove a repeatable job
  async removeRepeatable(name: string, repeat: any) {
    return await exampleQueue.removeRepeatable(name, repeat);
  }
};
