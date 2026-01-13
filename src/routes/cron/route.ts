import { Router, Request, Response } from 'express';
import { userActivityReminderJob } from '../../jobs/userActivityReminder';

const router = Router();

/**
 * POST /api/v1/cron/test-reminder
 * Manually trigger the user activity reminder job (for testing)
 * Admin only endpoint
 */
router.post('/test-reminder', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Manually triggering user activity reminder job...');
    
    // Run the job immediately
    await userActivityReminderJob.runNow();
    
    return res.json({
      success: true,
      message: 'User activity reminder job executed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error running user activity reminder job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/cron/status
 * Get status of all cron jobs
 */
router.get('/status', (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      userActivityReminder: {
        name: 'User Activity Reminder',
        schedule: 'Every hour (0 * * * *)',
        description: 'Sends reminders to users who have been offline for 3+ hours',
        status: 'active',
      },
    },
    message: 'Cron job status retrieved successfully',
  });
});

export default router;
