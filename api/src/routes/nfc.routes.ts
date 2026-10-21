import { Router } from 'express';
import { registerNfcTag, getMyNfcTags } from '../controllers/auxiliary.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.post('/register', registerNfcTag);
router.get('/my-tags', getMyNfcTags);

export default router;
