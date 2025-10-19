import { Router, Request, Response } from 'express'
import { verifySignature } from 'auth-fingerprint'
import TaskModel from 'models/Task'
import ClaimedTask from 'models/ClaimedTask'
import User from 'models/User'
import Notification from 'models/Notification'
import Activity from 'models/Activity'
import { checkTelegramMembership, extractTelegramId, sendTelegramNotification } from 'lib/telegramVerification'

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
    const result = verifySignature({ timestamp, signature, hash }, secretKey);
    
    if (!result.success) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid signature or request expired' 
      });
    }

    const { userId }= JSON.parse(result.data as string);

    const tasks = await TaskModel.find();
    
    // Check claimed status for each task
    const formattedTasks = await Promise.all(tasks.map(async (task) => {
      const claimedTask = await ClaimedTask.findOne({ 
        userId, 
        taskId: task._id.toString() 
      });
      
      return {
        id: task._id.toString(),
        platform: task.platform,
        title: task.title,
        description: task.description,
        reward: task.reward,
        link: task.link,
        claimed:  claimedTask?.status === 'verified',
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
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { timestamp, signature, hash } = req.body;

    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || '';
    const result = verifySignature({ timestamp, signature, hash }, secretKey);
    
    if (!result.success) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid signature or request expired' 
      });
    }

    const { userId, taskId } = JSON.parse(result.data as string);
    
    // Find the task
    const task = await TaskModel.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Find the user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if task already claimed
    const existingClaim = await ClaimedTask.findOne({ userId, taskId });

     if (existingClaim && existingClaim.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Task already claimed',
        data: {
          status: existingClaim.status,
          claimedAt: existingClaim.claimedAt
        }
      });
    }

    // If platform is Telegram, verify membership
    if (task.platform.toLowerCase() === 'telegram') {
      const channelId = extractTelegramId(task.link);

     
      const membershipCheck = await checkTelegramMembership(userId, channelId);
      
      if (!membershipCheck.isMember) {
        // Create pending claim
       if (!existingClaim) {
           const pendingClaim = new ClaimedTask({
          userId,
          taskId: task._id.toString(),
          platform: task.platform,
          status: 'rejected',
          reward: task.reward,
          metadata: {
            telegramUserId: userId,
            channelId,
            verificationAttempts: 1,
            error: membershipCheck.error || 'Not a member'
          }
        });
        await pendingClaim.save();
       }

        // Send notification to user with inline keyboard
        await sendTelegramNotification(
          userId,
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

        // Create notification in database
        await Notification.create({
          userId,
          title: 'Task Verification Failed',
          message: `Please join ${task.link} to claim this task`,
          type: 'warning',
          priority: 'medium',
          metadata: {
            taskId: task._id.toString(),
            taskTitle: task.title
          }
        });

        return res.status(400).json({
          success: false,
          message: 'You must join the Telegram channel/group first',
          data: {
            channelLink: task.link,
            error: membershipCheck.error
          }
        });
      }

      existingClaim.status = 'verified';
      existingClaim.claimedAt = new Date();
      existingClaim.completedAt = new Date();
      existingClaim.metadata = {
        telegramUserId: userId,
        channelId,
        membershipStatus: membershipCheck.status
      };
      await existingClaim.save();

      // Add reward to user balance
      const rewardAmount = parseFloat(task.reward);
      user.balanceTK += rewardAmount;
      user.totalEarned += rewardAmount;
      user.telegramBonus += rewardAmount;
      await user.save();

      // Create activity record
      await Activity.create({
        userId,
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
        userId,
        `🎉 *Task Completed Successfully!*\n\n` +
        `Task: ${task.title}\n` +
        `Reward: ${task.reward} USDT\n\n` +
        `💰 New Balance: ${user.balanceTK.toFixed(2)} USDT\n\n` +
        `Keep completing tasks to earn more! 🚀`
      );

      // Create notification in database
      await Notification.create({
        userId,
        title: 'Task Completed!',
        message: `You earned ${task.reward} USDT for completing "${task.title}"`,
        type: 'success',
        priority: 'high',
        metadata: {
          taskId: task._id.toString(),
          taskTitle: task.title,
          reward: task.reward
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Task claimed and verified successfully',
        data: {
          taskId: task._id.toString(),
          reward: task.reward,
          newBalance: user.balanceTK,
          status: 'completed'
        }
      });
    }

    // For non-Telegram platforms, create pending claim
    const claimedTask = new ClaimedTask({
      userId,
      taskId: task._id.toString(),
      platform: task.platform,
      status: 'pending',
      reward: task.reward
    });
    await claimedTask.save();

    // Create notification
    await Notification.create({
      userId,
      title: 'Task Claimed',
      message: `Your claim for "${task.title}" is pending verification`,
      type: 'info',
      priority: 'medium',
      metadata: {
        taskId: task._id.toString(),
        taskTitle: task.title
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Task claimed successfully, pending verification',
      data: {
        taskId: task._id.toString(),
        status: 'pending'
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
