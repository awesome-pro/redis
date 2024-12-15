import { Request, Response, RequestHandler } from 'express';
import { exampleQueue, queueHelpers } from '../queues/exampleQueue';
import redisClient from '../config/redis';

export const queueController = {
  // Add a job to the queue
  addJob: (async (req: Request, res: Response) => {
    try {
      const { data, delay, scheduleTime, recurring, cronExpression } = req.body;
      let job;

      if (delay) {
        // Schedule job with delay
        job = await queueHelpers.addDelayedJob(data, delay);
      } else if (scheduleTime) {
        // Schedule job for specific time
        job = await queueHelpers.scheduleJobForTime(data, new Date(scheduleTime));
      } else if (recurring) {
        // Add recurring job
        job = await queueHelpers.addRecurringJob(data);
      } else if (cronExpression) {
        // Add cron job
        job = await queueHelpers.addCronJob(data, cronExpression);
      } else {
        // Regular immediate job
        job = await exampleQueue.add('process-job', data);
      }

      res.json({ 
        success: true, 
        jobId: job.id,
        scheduledFor: job.opts.delay ? new Date(Date.now() + job.opts.delay) : 'immediate',
        jobType: job.name
      });
    } catch (error) {
      console.error('Job addition failed:', error);
      res.status(500).json({ error: 'Failed to add job to queue' });
    }
  }) as RequestHandler,

  // Get all jobs
  getAllJobs: (async (req: Request, res: Response) => {
    try {
      const jobs = await exampleQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      
      res.json({
        success: true,
        jobs: jobs.map(job => ({
          id: job.id,
        name: job.name,
        data: job.data,
        state: job.finishedOn ? 'completed' : job.failedReason ? 'failed' : job.isActive() ? 'active' : 'waiting',
        attempts: job.attemptsMade,
        timestamp: job.timestamp,
      })),
    });
  } catch (error) {
      console.error('Failed to retrieve jobs:', error);
      res.status(500).json({ error: 'Failed to retrieve jobs' });
    }
}) as RequestHandler,

  // Get job status with enhanced information
  getJobStatus: (async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = await exampleQueue.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const [state, progress] = await Promise.all([
        job.getState(),
        job.progress
      ]);

      res.json({
        jobId,
        state,
        data: job.data,
        progress,
        attempts: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        opts: job.opts
      });
    } catch (error) {
      console.error('Job status check failed:', error);
      res.status(500).json({ error: 'Failed to get job status' });
    }
  }) as RequestHandler,

  // Redis operations example with advanced features
  redisOperations: (async (req: Request, res: Response) => {
    try {
      // Pipeline multiple operations for better performance
      const pipeline = redisClient.pipeline();

      // String operations with expiry
      pipeline.set('example-key', 'Hello Redis!', 'EX', 3600); // Expires in 1 hour
      pipeline.get('example-key');

      // List operations
      pipeline.lpush('example-list', 'item1', 'item2');
      pipeline.lrange('example-list', 0, -1);

      // Hash operations with multiple fields
      pipeline.hset('example-hash', {
        field1: 'value1',
        field2: 'value2',
        timestamp: Date.now()
      });
      pipeline.hgetall('example-hash');

      // Set operations with intersection
      pipeline.sadd('set1', 'a', 'b', 'c');
      pipeline.sadd('set2', 'b', 'c', 'd');
      pipeline.sinter('set1', 'set2');
      pipeline.zrevrange('leaderboard', 0, -1, 'WITHSCORES');

      // Execute pipeline
      const results = await pipeline.exec();

      // Check if results is null or not iterable
      if (!results || !Array.isArray(results)) {
        throw new Error('Failed to execute pipeline or no results returned.');
      }

      // Transform results for response
      const [
        , [, stringValue],
        , [, list],
        , [, hash],
        , , [, intersection],
        , [, leaderboard]
      ] = results;

      res.json({
        string: stringValue,
        list,
        hash,
        intersection,
        leaderboard: leaderboard
      });
    } catch (error) {
      console.error('Redis operations failed:', error);
      res.status(500).json({ error: 'Redis operations failed' });
    }
  }) as RequestHandler
};
