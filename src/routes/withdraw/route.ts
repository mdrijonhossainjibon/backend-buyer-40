import { Router, Request, Response } from 'express'
import { verifySignature } from 'auth-fingerprint'
import User from 'models/User'
import Withdrawal from 'models/Withdrawal'
import Notification from 'models/Notification'
import { telegramBotService } from '../../services/telegram'

const router = Router();

router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';

    const result = verifySignature({ timestamp, signature, hash }, secretKey);
    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid signature or request expired' });
    }
    console.log(result.data);

    const { userId, withdrawMethod, accountNumber, accountName, amount } = JSON.parse(result.data as string);

    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false, 
        message: 'User not found'
      });
    }

    // Check if user is suspended
    if (user.status === 'suspend') {
      return res.status(403).json({
        success: false, 
        message: 'Your account has been suspended! Unable to withdraw।'
      });
    }

    // Validation checks
    const minWithdraw = 2
    const requiredReferrals = 0

    if (user.balanceTK < minWithdraw) {
      return res.status(400).json({
        success: false, 
        message: `Minimum withdrawal amount ${minWithdraw} USDT`
      });
    }

    if (user.referralCount < requiredReferrals) {
      return res.status(400).json({
        success: false, 
        message: `At least ${requiredReferrals} referrals are required to withdraw.`
      });
    }

    if (amount > user.balanceTK) {
      return res.status(400).json({
        success: false, 
        message: 'Insufficient balance!'
      });
    }

    if (amount < minWithdraw) {
      return res.status(400).json({
        success: false, 
        message: `Minimum ${minWithdraw} required`
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
      method: withdrawMethod as 'Bkash' | 'nagad' | 'rocket' | 'Binance',
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
      title: '💰 Withdrawal request submitted',
      message: `Your withdrawal request for ${amount} has been successfully submitted. ${withdrawMethod} will be sent to (${accountNumber}). Withdrawal ID: ${withdrawal.withdrawalId}`,
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

    // Send Telegram notification to user
    try {
      const telegramMessage = `💰 *Withdrawal Request Submitted*\n\n` +
        `✅ Your withdrawal request has been successfully submitted!\n\n` +
        `📋 *Details:*\n` +
        `• Amount: *${amount} USDT*\n` +
        `• Method: *${withdrawMethod}*\n` +
        `• Account: \`${accountNumber}\`\n` +
        `• Withdrawal ID: \`${withdrawal.withdrawalId}\`\n` +
        `• Status: *Pending*\n\n` +
        `⏳ Your withdrawal will be processed soon.\n` +
        `💵 Remaining Balance: *${(user.balanceTK - amount).toFixed(2)} USDT*`;

      await telegramBotService.sendMessageToUser(
        parseInt(userId),
        telegramMessage,
        { parse_mode: 'Markdown' }
      );
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError);
      // Don't fail the withdrawal if Telegram notification fails
    }

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
