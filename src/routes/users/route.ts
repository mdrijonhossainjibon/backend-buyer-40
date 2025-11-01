import { Router, Request, Response } from 'express';
import { verifySignature } from 'auth-fingerprint';
import User from 'models/User'
import Activity from 'models/Activity'
import Notification from 'models/Notification'
import AdsSettings from 'models/AdsSettings';
import Wallet from 'models/Wallet';

const router = Router();

// POST /api/v1/users - Create or get user
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY  || 'app';

    const result = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }

    const {  telegramId , username ,telegramUsername  , profilePicUrl , start_param } = JSON.parse(result.data  as string);
    
   
    let user = await User.findOne({ userId :  telegramId })



    
     if (!user) {
       // Check if it's feast time (special hours for bonus)
       const now = new Date()
       const currentHour = now.getHours()
       const isFeastTime = (currentHour >= 18 && currentHour <= 23) || (currentHour >= 6 && currentHour <= 10)
       const feastBonus = isFeastTime ? 0.015 : 0.02
     
     
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
 
             // Create referral notification for referrer
             await Notification.create({
               userId: referrer.userId,
               title: '🎁 Referral Bonus!',
               message: `Congratulations! A new user has joined through your referral. You have received ${referrerBonus} USDT bonus!`,
               type: 'success',
               priority: 'high',
               isRead: false,
               metadata: {
                 bonusAmount: referrerBonus,
                 referredUserId: telegramId,
                 bonusType: 'referral'
               }
             })
 
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
         telegramBonus: 0,
         youtubeBonus: 0,
         totalEarned: feastBonus,
         username
       })

       // Create wallet for new user with feast bonus
       await Wallet.create({
         userId: telegramId,
         balances: {
           xp: 0,
           usdt: feastBonus,
           spin: 0
         },
         locked: {
           xp: 0,
           usdt: 0,
           spin: 0
         },
         totalEarned: {
           xp: 0,
           usdt: feastBonus,
           spin: 0
         },
         totalSpent: {
           xp: 0,
           usdt: 0,
           spin: 0
         }
       })
 
       // Create welcome notification
       await Notification.create({
         userId : telegramId,
         title: '🎉 Welcome to EarnFromAds!',
         message: `Welcome to our platform! You have received ${feastBonus} USDT as registration bonus. Start watching ads to earn more!`,
         type: 'info',
         priority: 'high',
         isRead: false,
         metadata: {
           bonusAmount: feastBonus,
           registrationTime: now.toISOString(),
           isFeastTime
         }
       })
 
       // Create feast time bonus notification if applicable
       if (isFeastTime) {
         await Notification.create({
           userId : telegramId,
           title: '🎊 Party time bonus!',
           message: `You are lucky! You registered during feast time (6-10 AM or 6-11 PM) and received an extra ${feastBonus} USDT bonus!`,
           type: 'info',
           priority: 'high',
           isRead: false,
           metadata: {
             bonusType: 'feast_time',
             extraBonus: 10,
             feastTimeHours: '6-10 AM & 6-11 PM'
           }
         })
       }
 
       // Log user registration activity with bonus
       await Activity.create({
         userId : telegramId,
         activityType: 'signup',
         description: `User registered and received ${feastBonus} USDT bonus${isFeastTime ? ' (feast time)' : ''}${start_param ? ' (referral)' : ''}`,
         amount: feastBonus,
         status: 'completed',
         metadata: {
           isFirstLogin: true,
           isFeastTime,
           bonusAmount: feastBonus,
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



export default router;
