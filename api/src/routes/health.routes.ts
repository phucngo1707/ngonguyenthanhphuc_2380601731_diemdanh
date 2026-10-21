import { Router } from 'express';
import { getHealth, getHealthReady } from '../controllers/health.controller';

const router = Router();

router.get('/', getHealth);
router.get('/ready', getHealthReady);

export default router;
