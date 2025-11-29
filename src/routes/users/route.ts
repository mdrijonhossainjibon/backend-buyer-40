import { Router, Request, Response } from 'express';
import { verifySignature } from 'lib/auth';
import User from 'models/User'
import Activity from 'models/Activity'
import AdsSettings from 'models/AdsSettings';
import Wallet from 'models/Wallet';

const router = Router();

// POST /api/v1/users - Create or get user
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY  || 'app';

    ///const result = verifySignature({ timestamp, signature, hash }, secretKey);

    
    /* if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    } */

    const {  telegramId , username ,telegramUsername  , profilePicUrl , start_param } =  req.body; ///JSON.parse(result.data  as string);
    
   
    let user = await User.findOne({ userId :  telegramId })



    
     if (!user) {
       // Set fixed signup bonus
       const signupBonus = 0.02
     
     
       // Handle referral logic if start_param is provided
       let referrerBonus = 0
       if (start_param) {
         try {
             
           const referrer = await User.findOne({ referralCode : start_param})
           
           if (referrer) {
             // Update referrer's referral count
             referrerBonus = 0.015//  
             await User.findOneAndUpdate(
               { referralCode : start_param },
               { 
                 $inc: { 
                   referralCount: 1,
                   totalEarned: referrerBonus
                 }
               }
             )

             // Update referrer's wallet balance
             await Wallet.findOneAndUpdate(
               { userId: referrer.userId },
               {
                 $inc: {
                   'balances.usdt': referrerBonus,
                   'totalEarned.usdt': referrerBonus
                 },
                 lastTransaction: new Date()
               },
               { upsert: true }
             )
 
          
             // Log referral activity for referrer
             await Activity.create({
               userId:  referrer.userId,
               activityType: 'referral',
               description: `Referral bonus: New user (${telegramId}) joined`,
               amount: referrerBonus,
               status: 'completed',
               metadata: {
                 referredUserId: telegramId,
                 bonusType: 'referral'
               }
             })
           }
         } catch (error) {
           console.log('Referral processing error:', error)
         }
       }
 
       // Create new user with default values
       user = await User.create({
         userId : telegramId,
         referralCount: 0,
         totalEarned: signupBonus,
         username
       })

       // Create wallet for new user with signup bonus
       await Wallet.create({
         userId: telegramId,
         balances: {
           xp: 0,
           usdt: signupBonus,
           spin: 0
         },
         locked: {
           xp: 0,
           usdt: 0,
           spin: 0
         },
         totalEarned: {
           xp: 0,
           usdt: signupBonus,
           spin: 0
         },
         totalSpent: {
           xp: 0,
           usdt: 0,
           spin: 0
         }
       })
 
    
 
       // Log user registration activity with bonus
       await Activity.create({
         userId : telegramId,
         activityType: 'signup',
         description: `User registered and received ${signupBonus} USDT bonus${start_param ? ' (referral)' : ''}`,
         amount: signupBonus,
         status: 'completed',
         metadata: {
           isFirstLogin: true,
           bonusAmount: signupBonus,
           referredBy: start_param || null,
           userAgent: req.get('user-agent'),
           ipAddress: req.get('x-forwarded-for') || req.get('x-real-ip')
         }
       })
 
       // Log login activity
       await Activity.create({
         userId : telegramId,
         activityType: 'login',
         description: 'First login after registration',
         amount: 0,
         status: 'completed',
         metadata: {
           isFirstLogin: true,
           userAgent: req.get('user-agent'),
           ipAddress: req.get('x-forwarded-for') || req.get('x-real-ip')
         }
       })
     } else {
       // Update last login
       user.lastLogin = new Date()
       await user.save()
 
       // Log login activity
       await Activity.create({
         userId : telegramId,
         activityType: 'login',
         description: 'User login',
         amount: 0,
         status: 'completed',
         metadata: {
           userAgent: req.get('user-agent'),
           ipAddress: req.get('x-forwarded-for') || req.get('x-real-ip')
         }
       })
     }



        
    // Get AdsSettings configuration for ad watch settings
    const AdsConfig = await AdsSettings.findOne().sort({ createdAt: -1 })
    if (!AdsConfig) {
      return res.status(500).json({
        success: false, 
        message: 'AdsSettings configuration not found'
      })
    }
 
    // Check daily ad limit using activities and AdsSettings config
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAdWatchCount = await Activity.countDocuments({
      userId: user.userId,
      activityType: 'ad_watch',
      status: 'completed',
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    })
 

    // Get user's wallet
    const wallet = await Wallet.findOne({ userId: user.userId });
    
    const response  = {
      success: true,
      data: {
        userId: user.userId,
        referralCount: user.referralCount,
        dailyAdLimit: AdsConfig.adsWatchLimit,
        watchedToday: todayAdWatchCount,
        username: user.username,
        status: user.status,
        profile: {
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          avatar: user.profile?.avatar
        },
        totalEarned: user.totalEarned,
        referralCode: user.referralCode,
        wallet: wallet ? {
          balances: wallet.balances,
          locked: wallet.locked,
          available: {
            xp: wallet.balances.xp - wallet.locked.xp,
            usdt: wallet.balances.usdt - wallet.locked.usdt,
            spin: wallet.balances.spin - wallet.locked.spin
          },
          totalEarned: wallet.totalEarned,
          totalSpent: wallet.totalSpent
        } : null
      },
      message: 'User data retrieved successfully'
    }
    
    return res.json(response);
    
  } catch (error : any) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// POST /api/v1/users/fcm-token - Save or update FCM token for user
router.post('/users/fcm-token', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;


    console.log('FCM Token Request:', req.body);
    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || 'app';
    const { success, data } = verifySignature({ timestamp, signature, hash }, secretKey);

    if (!success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature or request expired'
      });
    }

    const { telegramId, fcmToken } = JSON.parse(data as string);

    if (!telegramId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: telegramId, fcmToken'
      });
    }

    // Find and update user with FCM token
    const user = await User.findOneAndUpdate(
      { userId: telegramId },
      { 
        fcmToken: fcmToken,
        lastTokenUpdate: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log FCM token update activity
    await Activity.create({
      userId: telegramId,
      activityType: 'fcm_token_update',
      description: 'FCM token updated for push notifications',
      amount: 0,
      status: 'completed',
      metadata: {
        tokenUpdated: true,
        userAgent: req.get('user-agent'),
        ipAddress: req.get('x-forwarded-for') || req.get('x-real-ip')
      }
    });

    return res.json({
      success: true,
      message: 'FCM token updated successfully',
      data: {
        userId: user.userId,
        tokenUpdated: true,
        lastTokenUpdate: user.lastTokenUpdate
      }
    });

  } catch (error: any) {
    console.error('FCM token update error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// GET /api/v1/users/fcm-token - Get FCM token for user
router.get('/users/fcm-token/:telegramId', async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        message: 'Missing telegramId parameter'
      });
    }

    const user = await User.findOne({ userId: telegramId }).select('fcmToken lastTokenUpdate');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: {
        userId: telegramId,
        fcmToken: user.fcmToken || null,
        lastTokenUpdate: user.lastTokenUpdate || null,
        hasToken: !!user.fcmToken
      }
    });

  } catch (error: any) {
    console.error('Get FCM token error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

export default router;
