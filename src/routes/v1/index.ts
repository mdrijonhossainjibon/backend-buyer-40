import { Router } from 'express';
import usersRouter from '@/routes/users';
import adsSettingsRouter from '@/routes/ads-settings/route';
import botStatusRouter from '@/routes/bot_status/route';
import notificationsRouter from '@/routes/notifications/route';
import telegramBonusRouter from '@/routes/tasks/telegram-bonus/route';
import youtubeBonusRouter from '@/routes/tasks/youtube-bonus/route';
import watchAdRouter from '@/routes/tasks/watch-ad/route';
import withdrawRouter from '@/routes/withdraw/route';
import adminRouter from '@/routes/admin';
 
const router = Router();

// Mount users routes
router.use('/v1', usersRouter);

// Mount ads-settings routes
router.use('/v1', adsSettingsRouter);

// Mount bot-status routes
router.use('/v1', botStatusRouter);

// Mount notifications routes
router.use('/v1', notificationsRouter);

// Mount task routes
router.use('/v1', telegramBonusRouter);
router.use('/v1', youtubeBonusRouter);
router.use('/v1', watchAdRouter);

// Mount withdraw routes
router.use('/v1', withdrawRouter);

// Mount admin routes
router.use('/v1/admin', adminRouter);

 
 
export default router;
 