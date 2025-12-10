import { Router, Request, Response } from 'express';
import { detectNetwork } from 'lib/detectNetwork';
import Network from 'models/Network';

const router = Router();

// Get all networks
router.get('/networks', async (req: Request, res: Response) => {
  try {
    let networks = await Network.find()
      .sort({ name: 1 })
      .lean();

    // If no networks exist, create default bep20-testnet
    if (networks.length === 0) {
      const defaultNetwork = new Network({
        id: 'bep20-testnet',
        name: 'BEP20 Testnet',
        type: 'BEP-20',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        explorer: 'https://testnet.bscscan.com',
        status: 'active'
      });
      await defaultNetwork.save();
      networks = await Network.find().lean();
    }

    return res.json({
      success: true,
      data: networks,
      message: 'Networks fetched successfully'
    });

  } catch (error: any) {
    console.error('Error fetching networks:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Get single network by ID
router.get('/networks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const network = await Network.findOne({ id }).lean();

    if (!network) {
      return res.status(404).json({
        success: false,
        message: 'Network not found'
      });
    }

    return res.json({
      success: true,
      data: network,
      message: 'Network fetched successfully'
    });

  } catch (error: any) {
    console.error('Error fetching network:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Admin: Create new network
router.post('/admin/networks', async (req: Request, res: Response) => {
  try {
    const { name, type, rpcUrl, explorer, status } = req.body;

    // Validate required fields
    if (!name || !rpcUrl || !explorer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id, name, rpcUrl, explorer'
      });
    }

    const result = detectNetwork({ name , type })
    // Check if network ID already exists
    const existingNetwork = await Network.findOne({ id : result.id });
    if (existingNetwork) {
      return res.status(400).json({
        success: false,
        message: 'Network with this ID already exists'
      });
    }

    const network = new Network({  id : result.id , name : result.name ,  type: result.type , rpcUrl,explorer,status: status || 'active'
    });

    await network.save();

    return res.json({
      success: true,
      data: network,
      message: 'Network created successfully'
    });

  } catch (error: any) {
    console.error('Error creating network:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Admin: Update network
router.put('/admin/networks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const network = await Network.findOne({ id });

    if (!network) {
      return res.status(404).json({
        success: false,
        message: 'Network not found'
      });
    }

    const { name, type, rpcUrl, explorer, status } = req.body;

    // Update network fields
    if (name !== undefined) network.name = name;
    if (type !== undefined) network.type = type;
    if (rpcUrl !== undefined) network.rpcUrl = rpcUrl;
    if (explorer !== undefined) network.explorer = explorer;
    if (status !== undefined) network.status = status;

    await network.save();

    return res.json({
      success: true,
      data: network,
      message: 'Network updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating network:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Admin: Delete network
router.delete('/admin/networks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const network = await Network.findOneAndDelete({ id });

    if (!network) {
      return res.status(404).json({
        success: false,
        message: 'Network not found'
      });
    }

    return res.json({
      success: true,
      message: 'Network deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting network:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

export default router;


 