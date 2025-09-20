import { Router, Request, Response } from 'express'
import { verifySignature } from 'auth-fingerprint'
import User from 'models/User'
import Withdrawal from 'models/Withdrawal'
import Notification from 'models/Notification'

const router = Router();

router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';

    const result = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }

    const { userId, withdrawMethod, accountNumber, accountName, amount } = JSON.parse(result.data as string);

    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false, 
        message: 'ব্যবহারকারী পাওয়া যায়নি'
      });
    }

    // Check if user is suspended
    if (user.status === 'suspend') {
      return res.status(403).json({
        success: false, 
        message: 'আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে! উইথড্র করতে পারবেন না।'
      });
    }

    // Validation checks
    const minWithdraw = 2
    const requiredReferrals = 0

    if (user.balanceTK < minWithdraw) {
      return res.status(400).json({
        success: false, 
        message: `ন্যূনতম উইথড্র পরিমাণ ${minWithdraw} টাকা`
      });
    }

    if (user.referralCount < requiredReferrals) {
      return res.status(400).json({
        success: false, 
        message: `উইথড্র করতে কমপক্ষে ${requiredReferrals} টি রেফারেল প্রয়োজন`
      });
    }

    if (amount > user.balanceTK) {
      return res.status(400).json({
        success: false, 
        message: 'অপর্যাপ্ত ব্যালেন্স!'
      });
    }

    if (amount < minWithdraw) {
      return res.status(400).json({
        success: false, 
        message: `ন্যূনতম ${minWithdraw} টাকা প্রয়োজন`
      });
    }

    // Calculate fees (you can adjust this logic as needed)
    const feePercentage = 0 // 0% fee for now
    const fees = Math.round(amount * feePercentage / 100)
    const netAmount = amount - fees

    // Create withdrawal record
    const withdrawal = await Withdrawal.create({
      userId,
      amount,
      method: withdrawMethod as 'bkash' | 'nagad' | 'rocket',
      accountDetails: {
        accountNumber,
        accountName: accountName || 'N/A'
      },
      fees,
      netAmount,
      status: 'pending',
      metadata: {
        ipAddress: req.get('x-forwarded-for') || req.get('x-real-ip'),
        userAgent: req.get('user-agent')
      }
    })

    // Update user balance
    await User.findOneAndUpdate(
      { userId },
      {
        $inc: {
          balanceTK: -amount,
          withdrawnAmount: amount
        }
      }
    )


    // Create withdrawal notification
    await Notification.create({
      userId,
      title: '💰 উইথড্র অনুরোধ জমা দেওয়া হয়েছে',
      message: `আপনার ${amount} টাকার উইথড্র অনুরোধ সফলভাবে জমা দেওয়া হয়েছে। ${withdrawMethod} (${accountNumber}) এ পাঠানো হবে। উইথড্র ID: ${withdrawal.withdrawalId}`,
      type: 'info',
      priority: 'high',
      isRead: false,
      metadata: {
        withdrawalId: withdrawal.withdrawalId,
        withdrawMethod,
        accountNumber,
        amount,
        fees,
        netAmount,
        requestTime: new Date().toISOString()
      }
    })

    return res.json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      data: {
        withdrawalId: withdrawal.withdrawalId,
        remainingBalance: user.balanceTK - amount,
        withdrawAmount: amount,
        fees,
        netAmount,
        method: withdrawMethod,
        accountNumber: accountNumber,
        status: 'pending'
      }
    })

  } catch (error) {
    console.error('Withdraw API error:', error);
    return res.status(500).json({
      success: false, 
      message: 'Internal server error'
    });
  }
});

export default router;
