import { Router } from 'express';
import { updateController } from './controller';

const router = Router();

/**
 * @swagger
 * /api/v1/update/check:
 *   get:
 *     summary: Check for app updates
 *     description: Get the latest app version information and download details
 *     tags: [Update]
 *     responses:
 *       200:
 *         description: Update information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Update information retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     version:
 *                       type: string
 *                       example: "3.2.0"
 *                     currentVersion:
 *                       type: string
 *                       example: "3.1.8"
 *                     size:
 *                       type: string
 *                       example: "125.4 MB"
 *                     description:
 *                       type: string
 *                       example: "Update your application to the latest version to enjoy new features and improvements."
 *                     downloadUrl:
 *                       type: string
 *                       example: "https://mdrijonhossajibon.shop/app-release.apk"
 *                     packageName:
 *                       type: string
 *                       example: "com.rn_panel"
 *                     fileName:
 *                       type: string
 *                       example: "app-release.apk"
 *                     releaseDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-11-30T08:00:00Z"
 *                     isForceUpdate:
 *                       type: boolean
 *                       example: false
 *                     minSupportedVersion:
 *                       type: string
 *                       example: "3.0.0"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to retrieve update information"
 */
router.get('/update/check', updateController.checkUpdate);

/**
 * @swagger
 * /api/v1/update/version/{version}:
 *   get:
 *     summary: Check if specific version needs update
 *     description: Compare a specific version with the latest available version
 *     tags: [Update]
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *         description: Current app version to check
 *         example: "3.1.8"
 *     responses:
 *       200:
 *         description: Version comparison result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Version check completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     needsUpdate:
 *                       type: boolean
 *                       example: true
 *                     currentVersion:
 *                       type: string
 *                       example: "3.1.8"
 *                     latestVersion:
 *                       type: string
 *                       example: "3.2.0"
 *                     isForceUpdate:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Invalid version format
 *       500:
 *         description: Internal server error
 */
router.get('/update/version/:version', updateController.checkVersion);

export default router;
