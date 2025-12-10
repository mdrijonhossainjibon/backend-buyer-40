import { Router } from 'express';

import adsSettingsRouter from 'routes/ads-settings/route';
import botStatusRouter from 'routes/bot_status/route';
import watchAdRouter from 'routes/tasks/watch-ad/route';
import tasksRouter from 'routes/tasks/route';
import withdrawRouter from 'routes/withdraw/route';
import adminRouter from 'routes/admin';
import usersRouter from 'routes/users/route';
import spinWheelRouter from 'routes/spin-wheel/route';
import swapRouter from 'routes/swap/route';
import walletRouter from 'routes/wallet/route';
import userWalletRouter from 'routes/user-wallet/route';
import mysteryBoxRouter from 'routes/mystery-box/route';
import converterRouter from 'routes/converter/route';
import cryptoCoinsRouter from 'routes/crypto-coins/route';
import networkRouter from 'routes/network/route';
import adminWalletRouter from 'routes/admin-wallet/route';
import cronRouter from 'routes/cron/route';
import firebaseRouter from 'routes/firebase/route';
import notificationsRouter from 'routes/notifications/route';
import updateRouter from 'routes/update/route';

const router = Router();
 
router.use('/v1', usersRouter);
 
router.use('/v1', adsSettingsRouter);

// Mount spin wheel routes
router.use('/v1', spinWheelRouter);

// Mount mystery box routes
router.use('/v1', mysteryBoxRouter);

// Mount bot-status routes
router.use('/v1', botStatusRouter);



router.use('/v1', watchAdRouter);
router.use('/v1', tasksRouter);

// Mount withdraw routes
router.use('/v1', withdrawRouter);

// Mount swap routes
router.use('/v1', swapRouter);

// Mount converter routes
router.use('/v1', converterRouter);

// Mount wallet routes
router.use('/v1/wallet', walletRouter);

// Mount user wallet routes
router.use('/v1/user-wallet', userWalletRouter);

// Mount admin routes
router.use('/v1/admin', adminRouter);

// Mount crypto coins routes
router.use('/v1', cryptoCoinsRouter);

// Mount network routes
router.use('/v1', networkRouter);

// Mount admin wallet routes
router.use('/v1/admin-wallet', adminWalletRouter);

// Mount cron routes
router.use('/v1/cron', cronRouter);

// Mount Firebase routes
router.use('/v1/firebase', firebaseRouter);

// Mount Notifications routes
router.use('/v1', notificationsRouter);
 router.use('/v1', updateRouter);
 
export default router;
 