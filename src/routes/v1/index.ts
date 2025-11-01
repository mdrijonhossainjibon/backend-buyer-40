import { Router } from 'express';

import adsSettingsRouter from 'routes/ads-settings/route';
import botStatusRouter from 'routes/bot_status/route';
import notificationsRouter from 'routes/notifications/route';
import telegramBonusRouter from 'routes/tasks/telegram-bonus/route';
import youtubeBonusRouter from 'routes/tasks/youtube-bonus/route';
import watchAdRouter from 'routes/tasks/watch-ad/route';
import tasksRouter from 'routes/tasks/route';
import withdrawRouter from 'routes/withdraw/route';
import adminRouter from 'routes/admin';
import usersRouter from 'routes/users/route';
import spinWheelRouter from 'routes/spin-wheel/route';
import swapRouter from 'routes/swap/route';
import walletRouter from 'routes/wallet/route';
import mysteryBoxRouter from 'routes/mystery-box/route';

const router = Router();
 
router.use('/v1', usersRouter);
 
router.use('/v1', adsSettingsRouter);

// Mount spin wheel routes
router.use('/v1', spinWheelRouter);

// Mount mystery box routes
router.use('/v1', mysteryBoxRouter);

// Mount bot-status routes
router.use('/v1', botStatusRouter);

// Mount notifications routes
router.use('/v1', notificationsRouter);

// Mount task routes
router.use('/v1', telegramBonusRouter);
router.use('/v1', youtubeBonusRouter);
router.use('/v1', watchAdRouter);
router.use('/v1', tasksRouter);

// Mount withdraw routes
router.use('/v1', withdrawRouter);

// Mount swap routes
router.use('/v1', swapRouter);

// Mount wallet routes
router.use('/v1/wallet', walletRouter);

// Mount admin routes
router.use('/v1/admin', adminRouter);


 
export default router;
 