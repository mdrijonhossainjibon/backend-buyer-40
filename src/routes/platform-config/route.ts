import { Router } from 'express';
import {
  getPlatformConfig,
  updatePlatformConfig,
  updatePlatformConfigField,
  resetPlatformConfig
} from 'controllers/platformConfigController';

const router = Router();

// GET /api/v1/platform-config - Get current platform configuration
router.get('/', getPlatformConfig);

// PUT /api/v1/platform-config - Update platform configuration
router.put('/', updatePlatformConfig);

// PATCH /api/v1/platform-config/:field - Update specific field
router.patch('/:field', updatePlatformConfigField);

// POST /api/v1/platform-config/reset - Reset to default configuration
router.post('/reset', resetPlatformConfig);

export default router;
