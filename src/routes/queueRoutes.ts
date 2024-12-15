import { Router } from 'express';
import { queueController } from '../controllers/queueController';

const router = Router();

router.post('/job', queueController.addJob);
router.get('/job/:jobId', queueController.getJobStatus);
router.get('/redis-examples', queueController.redisOperations);
router.get('/jobs', queueController.getAllJobs);

export default router;
