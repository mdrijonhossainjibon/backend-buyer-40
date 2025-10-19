import { Router, Request, Response } from 'express';
import { verifySignature } from 'auth-fingerprint';
import User from 'models/User'
import Activity from 'models/Activity'
import Notification from 'models/Notification'
import AdsSettings from 'models/AdsSettings';


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

    const { userId , start_param , username } = JSON.parse(result.data  as string)
   
    let user = await User.findOne({ userId })



    
     if (!user) {
       // Check if it's feast time (special hours for bonus)
       const now = new Date()
       const currentHour = now.getHours()
       const isFeastTime = (currentHour >= 18 && currentHour <= 23) || (currentHour >= 6 && currentHour <= 10)
       const feastBonus = isFeastTime ? 20 : 25 
     
     
       // Handle referral logic if start_param is provided
       let referrerBonus = 0
       if (start_param) {
         try {
             
           const referrer = await User.findOne({ referralCode : start_param})
           
           if (referrer) {
             // Update referrer's referral count and give bonus
             referrerBonus = 5 // 25 TK bonus for referrer
             await User.findOneAndUpdate(
               { referralCode : start_param },
               { 
                 $inc: { 
                   referralCount: 1,
                   balanceTK: referrerBonus,
                   totalEarned: referrerBonus
                 }
               }
             )
 
             // Create referral notification for referrer
             await Notification.create({
               userId: referrer.userId,
               title: '🎁 Referral Bonus!',
               message: `Congratulations! A new user has joined through your referral. You have received ${referrerBonus} TK bonus!`,
               type: 'success',
               priority: 'high',
               isRead: false,
               metadata: {
                 bonusAmount: referrerBonus,
                 referredUserId: userId,
                 bonusType: 'referral'
               }
             })
 
             // Log referral activity for referrer
             await Activity.create({
               userId:  referrer.userId,
               activityType: 'referral',
               description: `Referral bonus: New user (${userId}) joined`,
               amount: referrerBonus,
               status: 'completed',
               metadata: {
                 referredUserId: userId,
                 bonusType: 'referral'
               }
             })
           }
         } catch (error) {
           console.log('Referral processing error:', error)
         }
       }
 
       // Create new user with default values and feast bonus
       user = await User.create({
         userId,
         balanceTK: feastBonus,
         referralCount: 0,
         telegramBonus: 0,
         youtubeBonus: 0,
         totalEarned: feastBonus,
         username
       })
 
       // Create welcome notification
       await Notification.create({
         userId,
         title: '🎉 Welcome to EarnFromAds!',
         message: `Welcome to our platform! You have received ${feastBonus} TK as registration bonus. Start watching ads to earn more!`,
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
           userId,
           title: '🎊 Party time bonus!',
           message: `You are lucky! You registered during feast time (6-10 AM or 6-11 PM) and received an extra ${feastBonus} TK bonus!`,
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
         userId,
         activityType: 'signup',
         description: `User registered and received ${feastBonus} TK bonus${isFeastTime ? ' (feast time)' : ''}${start_param ? ' (referral)' : ''}`,
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
         userId,
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
         userId,
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
 

    const response  = {
      success: true,
      data: {
        userId: user.userId,
        balanceTK: user.balanceTK,
        referralCount: user.referralCount,
        dailyAdLimit: AdsConfig.adsWatchLimit,
        watchedToday: todayAdWatchCount,
        telegramBonus: user.telegramBonus,
        youtubeBonus: user.youtubeBonus,
        
        username: user.username,
        status: user.status,
        profile: {
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          avatar: user.profile?.avatar
        },
        totalEarned: user.totalEarned,
        availableBalance: user.balanceTK,
        referralCode: user.referralCode,
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
