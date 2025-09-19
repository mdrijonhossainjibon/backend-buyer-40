import { Router } from 'express';
import botStatusRouter from '@/routes/admin/bots/status/route';
import botConfigRouter from '@/routes/admin/bots/config/route';
import botDataRouter from '@/routes/admin/bots/data/route';
import botWebhookRouter from '@/routes/admin/bots/webhook/route';
import botStopRouter from '@/routes/admin/bots/stop/route';

const router = Router();

// Bot routes
router.use('/bots/status', botStatusRouter);
router.use('/bots/config', botConfigRouter);
router.use('/bots/data', botDataRouter);
router.use('/bots/webhook', botWebhookRouter);
router.use('/bots/stop', botStopRouter);

export default router;
