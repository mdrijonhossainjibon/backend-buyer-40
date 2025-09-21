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

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY  || '';

    const result = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }

    const { userId , start_param , username } = JSON.parse(result.data  as string)
   
    // Find or create user
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
             referrerBonus = 20 // 25 TK bonus for referrer
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
               title: '🎁 রেফারেল বোনাস!',
               message: `অভিনন্দন! আপনার রেফারেলের মাধ্যমে একজন নতুন ব্যবহারকারী যোগ দিয়েছেন। আপনি ${referrerBonus} টাকা বোনাস পেয়েছেন!`,
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
               description: `রেফারেল বোনাস: নতুন ব্যবহারকারী (${userId}) যোগদান`,
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
         title: '🎉 EarnFromAds এ স্বাগতম!',
         message: `আমাদের প্ল্যাটফর্মে স্বাগতম! আপনি রেজিস্ট্রেশন বোনাস হিসেবে ${feastBonus} টাকা পেয়েছেন। আরো আয় করতে বিজ্ঞাপন দেখা শুরু করুন!`,
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
           message: `আপনি ভাগ্যবান! আপনি ভোজের সময় (সকাল ৬-১০টা অথবা সন্ধ্যা ৬-১১টা) রেজিস্ট্রেশন করেছেন এবং অতিরিক্ত ${feastBonus} টাকা বোনাস পেয়েছেন!`,
           type: 'info',
           priority: 'high',
           isRead: false,
           metadata: {
             bonusType: 'feast_time',
             extraBonus: 10,
             feastTimeHours: 'সকাল ৬-১০টা ও সন্ধ্যা ৬-১১টা'
           }
         })
       }
 
       // Log user registration activity with bonus
       await Activity.create({
         userId,
         activityType: 'signup',
         description: `ব্যবহারকারী রেজিস্ট্রেশন করেছেন এবং ${feastBonus} টাকা বোনাস পেয়েছেন${isFeastTime ? ' (ভোজের সময়)' : ''}${start_param ? ' (রেফারেল)' : ''}`,
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
         description: 'রেজিস্ট্রেশনের পর প্রথম লগইন',
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



        
    // Get bot configuration for ad watch settings
    const AdsConfig = await AdsSettings.findOne().sort({ createdAt: -1 })
    if (!AdsConfig) {
      return res.status(500).json({
        success: false, 
        message: 'Bot configuration not found'
      })
    }
 
    // Check daily ad limit using activities and bot config
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
    console.error('Error fetching users:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});



export default router;
