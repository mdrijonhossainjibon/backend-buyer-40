import { Router, Request, Response } from 'express';
import Admin from 'models/Admin';
import bcrypt from 'bcryptjs';

const router = Router();

// GET - Fetch all admins
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string || '';
    const role = req.query.role as string || 'all';
    const status = req.query.status as string || 'all';
    const limit = parseInt(req.query.limit as string || '100');
    const offset = parseInt(req.query.offset as string || '0');

    // Build query filter
    const query: any = {};
 
    // Filter by role
    if (role && role !== 'all') {
      query.role = role;
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search by username or email
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { username: searchRegex },
        { email: searchRegex }
      ];
    }

    // Get total count
    const total = await Admin.countDocuments(query);

    // Fetch admins with pagination (exclude password)
    const admins = await Admin.find(query)
      .select('-password -otp -otpExpiry')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: admins,
      total,
      hasMore: offset + limit < total
    });

  } catch (error) {
    console.error('Admin management GET error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admins'
    });
  }
});

// GET - Fetch single admin by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id)
      .select('-password -otp -otpExpiry')
      .lean();

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    return res.json({
      success: true,
      data: admin
    });

  } catch (error) {
    console.error('Admin management GET by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin'
    });
  }
});

// POST - Create new admin
router.post('/', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role, status } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    // Check if username already exists
    const existingUsername = await Admin.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await Admin.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new Admin({
      username,
      email,
      password: hashedPassword,
      role: role || 'admin',
      status: status || 'active'
    });

    await newAdmin.save();

    // Return admin without sensitive fields
    const adminResponse = {
      _id: newAdmin._id,
      username: newAdmin.username,
      email: newAdmin.email,
      role: newAdmin.role,
      status: newAdmin.status,
      createdAt: newAdmin.createdAt,
      updatedAt: newAdmin.updatedAt
    };

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: adminResponse
    });

  } catch (error: any) {
    console.error('Admin management POST error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create admin'
    });
  }
});

// PUT - Update admin
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, password, role, status } = req.body;

    // Find admin
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Check if username is being changed and already exists
    if (username && username !== admin.username) {
      const existingUsername = await Admin.findOne({ username, _id: { $ne: id } });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      admin.username = username;
    }

    // Check if email is being changed and already exists
    if (email && email !== admin.email) {
      const existingEmail = await Admin.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
      admin.email = email;
    }

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    // Update role if provided
    if (role) {
      admin.role = role;
    }

    // Update status if provided
    if (status !== undefined) {
      admin.status = status;
    }

    await admin.save();

    // Return updated admin without sensitive fields
    const adminResponse = {
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    };

    return res.json({
      success: true,
      message: 'Admin updated successfully',
      data: adminResponse
    });

  } catch (error: any) {
    console.error('Admin management PUT error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update admin'
    });
  }
});

// PATCH - Toggle admin status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status (active/inactive) is required'
      });
    }

    const admin = await Admin.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select('-password -otp -otpExpiry');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    return res.json({
      success: true,
      message: `Admin status updated to ${status}`,
      data: admin
    });

  } catch (error) {
    console.error('Admin management PATCH status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update admin status'
    });
  }
});

// DELETE - Delete admin
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent deleting super_admin (optional safety check)
    if (admin.role === 'super_admin') {
      // Count super admins
      const superAdminCount = await Admin.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last super admin'
        });
      }
    }

    await Admin.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Admin deleted successfully'
    });

  } catch (error) {
    console.error('Admin management DELETE error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete admin'
    });
  }
});

export default router;
