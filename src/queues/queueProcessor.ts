import { Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Initialize Redis connection for the worker
const workerConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// Process jobs
export const initializeWorker = () => {
  const worker = new Worker(
    'tasks-queue',
    async (job: Job) => {
      console.log(`Processing job ${job.id}`);
      
      switch (job.name) {
        case 'process-job':
          await processJob(job);
          break;
        case 'email-notification':
          await processEmailNotification(job);
          break;
        case 'data-cleanup':
          await processDataCleanup(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: workerConnection,
      // Concurrency limit
      concurrency: 5,
      // Remove completed jobs
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      // Remove failed jobs
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    }
  );

  worker.on('completed', (job: Job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job<any, any, string> | undefined, err: Error) => {
    if (job) {
      console.error(`Job ${job.id} failed with error: ${err.message}`);
    } else {
      console.error(`A job failed with error: ${err.message}`);
    }
  });

  return worker;
};

// Example job processors
async function processJob(job: Job) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 5000));
  return { processed: true, timestamp: new Date() };
}

async function processEmailNotification(job: Job) {
  console.log('Sending email notification:', job.data);
  // Implement email sending logic here
  return { sent: true };
}

async function processDataCleanup(job: Job) {
  console.log('Performing data cleanup:', job.data);
  // Implement cleanup logic here
  return { cleaned: true };
}
