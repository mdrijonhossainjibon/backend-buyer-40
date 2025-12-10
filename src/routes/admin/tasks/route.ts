import { Router, Request, Response } from 'express';
import TaskModel, { ITask } from 'models/Task';

const router = Router();

/**
 * @swagger
 * /admin/tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Retrieve all tasks with optional filtering and pagination
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search tasks by title or description
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter by platform (youtube, telegram, twitter, instagram)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of tasks per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: number
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string || '';
    const platform = req.query.platform as string || '';
    const limit = parseInt(req.query.limit as string || '10');
    const offset = parseInt(req.query.offset as string || '0');

    // Build query filter
    const query: any = {};

    // Filter by platform if provided
    if (platform && platform.trim() !== '') {
      query.platform = platform.toLowerCase();
    }

    // Filter by search query if provided
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex }
      ];
    }

    // Get total count for pagination
    const total = await TaskModel.countDocuments(query);

    // Fetch tasks with pagination
    const tasks = await TaskModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    return res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: tasks,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /admin/tasks:
 *   post:
 *     summary: Create a new task
 *     description: Create a new task for users to complete
 *     tags: [Admin Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *               - title
 *               - description
 *               - reward
 *               - link
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [youtube, telegram, twitter, instagram]
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               reward:
 *                 type: string
 *               link:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { platform, title, description, reward, link } = req.body;

    // Validate required fields
    if (!platform || !title || !description || !reward || !link) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: platform, title, description, reward, link'
      });
    }

    // Validate platform
    const validPlatforms = ['youtube', 'telegram', 'twitter', 'instagram'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
      });
    }

    // Create new task
    const newTask = new TaskModel({
      platform: platform.toLowerCase(),
      title,
      description,
      reward,
      link
    });

    await newTask.save();

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /admin/tasks/{id}:
 *   get:
 *     summary: Get a specific task
 *     description: Retrieve a single task by ID
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await TaskModel.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task retrieved successfully',
      data: task
    });
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /admin/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     description: Update an existing task
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               reward:
 *                 type: string
 *               link:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { platform, title, description, reward, link } = req.body;

    const task = await TaskModel.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Validate platform if provided
    if (platform) {
      const validPlatforms = ['youtube', 'telegram', 'twitter', 'instagram'];
      if (!validPlatforms.includes(platform.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
        });
      }
      task.platform = platform.toLowerCase();
    }

    // Update fields if provided
    if (title) task.title = title;
    if (description) task.description = description;
    if (reward) task.reward = reward;
    if (link) task.link = link;

    await task.save();

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /admin/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: Delete a task by ID
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await TaskModel.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: task
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
