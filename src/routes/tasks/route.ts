import { Router, Request, Response } from 'express'

import TaskModel from 'models/Task'
import ClaimedTask from 'models/ClaimedTask'
import User from 'models/User'
import Wallet from 'models/Wallet'
import Activity from 'models/Activity'
import { checkTelegramMembership, extractTelegramId, sendTelegramNotification } from 'lib/telegramVerification';
import { io } from '../../server'
import { verifySignature } from 'lib/auth';

const router = Router();

// GET /api/v1/tasks - Get all tasks
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.query;


    if (!timestamp || !signature || !hash) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';
    const { success, data } = verifySignature({ timestamp, signature, hash }, secretKey);

    if (!success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature or request expired'
      });
    }

    const { telegramId } = JSON.parse(data as string);

    const tasks = await TaskModel.find();

    // Check claimed status for each task
    const formattedTasks = await Promise.all(tasks.map(async (task) => {
      const claimedTask = await ClaimedTask.findOne({
        userId: telegramId,
        taskId: task._id.toString()
      });

      return {
        id: task._id.toString(),
        platform: task.platform,
        title: task.title,
        description: task.description,
        reward: task.reward,
        link: task.link,
        claimed: claimedTask?.status === 'verified',
      };
    }));

    return res.json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: formattedTasks
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});



// POST /api/v1/tasks - claim a task
router.post('/tasks/claim', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || 'app';
    const { success, data } = verifySignature({ timestamp, signature, hash }, secretKey);

    if (!success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature or request expired'
      });
    }

    const { telegramId, taskId } = JSON.parse(data as string);

    // Find the task
    const task = await TaskModel.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Find the user
    const user = await User.findOne({ userId: telegramId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if task already claimed
    const existingClaim = await ClaimedTask.findOne({ userId: telegramId, taskId });

    // If already claimed with verified or pending status, return error
    if (existingClaim && (existingClaim.status === 'verified' || existingClaim.status === 'pending')) {
      return res.status(400).json({
        success: false,
        message: 'You have already claimed this task',
        data: {
          status: existingClaim.status,
          claimedAt: existingClaim.claimedAt
        }
      });
    }

    // If platform is Telegram, verify membership
    if (task.platform.toLowerCase() === 'telegram') {
      const channelId = extractTelegramId(task.link);

      const membershipCheck = await checkTelegramMembership(telegramId, channelId);

      if (!membershipCheck.isMember) {
        // Only create rejected claim if no existing claim
        if (!existingClaim) {
          const pendingClaim = new ClaimedTask({
            userId: telegramId,
            taskId: task._id.toString(),
            platform: task.platform,
            status: 'rejected',
            reward: task.reward,
            metadata: {
              telegramUserId: telegramId,
              channelId,
              verificationAttempts: 1,
              error: membershipCheck.error || 'Not a member'
            }
          });
          await pendingClaim.save();
        }

        // Send notification to user with inline keyboard
        await sendTelegramNotification(
          telegramId,
          `❌ *Task Verification Failed*\n\n` +
          `Task: ${task.title}\n` +
          `Reason: You must join the channel/group first\n\n` +
          `Click the button below to join, then try claiming again! 🔄`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '📱 Join Channel/Group',
                    url: task.link
                  }
                ],
                [
                  {
                    text: '🔄 Try Again',
                    callback_data: `claim_task_${task._id.toString()}`
                  }
                ]
              ]
            }
          }
        );


        return res.status(400).json({
          success: false,
          message: 'You must join the Telegram channel/group first',
          data: {
            channelLink: task.link,
            error: membershipCheck.error
          }
        });
      }

      // Create new claim or update rejected claim to verified
      if (!existingClaim || existingClaim.status === 'rejected') {
        if (existingClaim) {
          // Update rejected claim to verified
          existingClaim.status = 'verified';
          existingClaim.claimedAt = new Date();
          existingClaim.completedAt = new Date();
          existingClaim.metadata = {
            telegramUserId: telegramId,
            channelId,
            membershipStatus: membershipCheck.status
          };
          await existingClaim.save();
        } else {
          // Create new verified claim
          const claim = new ClaimedTask({
            userId: telegramId,
            taskId: task._id.toString(),
            platform: task.platform,
            status: 'verified',
            reward: task.reward,
            metadata: {
              telegramUserId: telegramId,
              channelId,
              membershipStatus: membershipCheck.status
            }
          });
          await claim.save();
        }
      }

      // Get or create wallet
      let wallet = await Wallet.findOne({ userId: telegramId });
      if (!wallet) {
        wallet = await Wallet.create({
          userId: telegramId,
          balances: { xp: 0, usdt: 0, spin: 0 },
          locked: { xp: 0, usdt: 0, spin: 0 },
          totalEarned: { xp: 0, usdt: 0, spin: 0 },
          totalSpent: { xp: 0, usdt: 0, spin: 0 }
        });
      }

      // Add reward to wallet balance
      const rewardAmount = parseFloat(task.reward);
      wallet.balances.xp += rewardAmount;
      wallet.totalEarned.xp += rewardAmount;
      wallet.lastTransaction = new Date();
      await wallet.save();


      // Create activity record
      await Activity.create({
        userId: telegramId,
        activityType: 'task_complete',
        description: `Completed task: ${task.title}`,
        amount: rewardAmount,
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          taskId: task._id.toString(),
          platform: task.platform,
          taskTitle: task.title
        }
      });

      // Send success notification via Telegram
      await sendTelegramNotification(
        telegramId,
        `🎉 *Task Completed Successfully!*\n\n` +
        `Task: ${task.title}\n` +
        `Reward: ${task.reward} XP\n\n` +
        `💰 USDT Balance: ${wallet.balances.usdt.toFixed(2)} USDT\n` +
        `⭐ XP Balance: ${wallet.balances.xp.toFixed(2)} XP\n\n` +
        `Keep completing tasks to earn more! 🚀`
      );

      io.emit('user:xp:update', {
        userId: telegramId,
        xp: wallet.balances.xp
      });

      return res.status(201).json({
        success: true,
        message: 'Task claimed and verified successfully',
        data: {
          taskId: task._id.toString(),
          reward: task.reward,
          newBalance: wallet.balances.usdt,
          status: 'completed'
        }
      });
    }

    // For non-Telegram platforms 
    const claimedTask = new ClaimedTask({
      userId: telegramId,
      taskId: task._id.toString(),
      platform: task.platform,
      status: 'verified',
      reward: task.reward
    });
    await claimedTask.save();

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId: telegramId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: telegramId,
        balances: { xp: 0, usdt: 0, spin: 0 },
        locked: { xp: 0, usdt: 0, spin: 0 },
        totalEarned: { xp: 0, usdt: 0, spin: 0 },
        totalSpent: { xp: 0, usdt: 0, spin: 0 }
      });
    }

    // Add reward to wallet balance
    const rewardAmount = parseFloat(task.reward);
    wallet.balances.xp += rewardAmount;
    wallet.totalEarned.xp += rewardAmount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    // Create activity record
    await Activity.create({
      userId: telegramId,
      activityType: 'task_complete',
      description: `Completed task: ${task.title}`,
      amount: rewardAmount,
      status: 'completed',
      completedAt: new Date(),
      metadata: {
        taskId: task._id.toString(),
        platform: task.platform,
        taskTitle: task.title
      }
    });



    io.emit('user:xp:update', {
      userId: telegramId,
      xp: wallet.balances.xp
    });

    return res.status(201).json({
      success: true,
      message: 'Task claimed and verified successfully',
      data: {
        taskId: task._id.toString(),
        status: 'verified',
        reward: task.reward,
      }
    });

  } catch (error) {
    console.error('Claim task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


export default router;
