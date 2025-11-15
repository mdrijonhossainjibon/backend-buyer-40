import { Router, Request, Response } from 'express';
import CryptoCoin from 'models/CryptoCoin';

const router = Router();

// Get all active crypto coins with their networks
router.get('/crypto-coins', async (req: Request, res: Response) => {
  try {
    // Fetch all active crypto coins, sorted by order
    const cryptoCoins = await CryptoCoin.find({ isActive: true })
      .sort({ order: 1 })
      .lean();
 

    // Filter to only include active networks
    const formattedCoins = cryptoCoins.map(coin => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      icon: coin.icon,
      networks: coin.networks.filter(network => network.isActive)
    }));


    
    
    return res.json({
      success: true,
      data: formattedCoins,
      message: 'Crypto coins fetched successfully'
    });

  } catch (error: any) {
    console.error('Error fetching crypto coins:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Admin endpoint to add/update crypto coin
router.post('/admin/crypto-coins', async (req: Request, res: Response) => {
  try {
    const { id, name, symbol, icon, networks, isActive, order } = req.body;

    // Validate required fields
    if (!id || !name || !symbol || !icon || !networks) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id, name, symbol, icon, networks'
      });
    }

    // Check if coin already exists
    const existingCoin = await CryptoCoin.findOne({ id });

    if (existingCoin) {
      // Update existing coin
      existingCoin.name = name;
      existingCoin.symbol = symbol.toUpperCase();
      existingCoin.icon = icon;
      existingCoin.networks = networks;
      existingCoin.isActive = isActive !== undefined ? isActive : true;
      existingCoin.order = order !== undefined ? order : 0;
      
      await existingCoin.save();

      return res.json({
        success: true,
        data: existingCoin,
        message: 'Crypto coin updated successfully'
      });
    } else {
      // Create new coin
      const newCoin = await CryptoCoin.create({
        id,
        name,
        symbol: symbol.toUpperCase(),
        icon,
        networks,
        isActive: isActive !== undefined ? isActive : true,
        order: order !== undefined ? order : 0
      });

      return res.json({
        success: true,
        data: newCoin,
        message: 'Crypto coin created successfully'
      });
    }

  } catch (error: any) {
    console.error('Error creating/updating crypto coin:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Admin endpoint to delete crypto coin
router.delete('/admin/crypto-coins/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coin = await CryptoCoin.findOne({ id });

    if (!coin) {
      return res.status(404).json({
        success: false,
        message: 'Crypto coin not found'
      });
    }

    // Soft delete by setting isActive to false
    coin.isActive = false;
    await coin.save();

    return res.json({
      success: true,
      message: 'Crypto coin deactivated successfully'
    });

  } catch (error: any) {
    console.error('Error deleting crypto coin:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});



router.delete('/admin/crypto-coins/:id/network/:networkName', async (req: Request, res: Response) => {
  try {
    const { id, networkName } = req.params;

    // Find coin
const coin = await CryptoCoin.findOne({ id: { $regex: new RegExp(`^${id}$`, 'i') }});



    if (!coin) {
      return res.status(404).json({
        success: false,
        message: 'Crypto coin not found'
      });
    }

    // Filter out the network by name
    const updatedNetworks = coin.networks.filter(
      (net) => net.id !== networkName
    );

    // If nothing removed
    if (updatedNetworks.length === coin.networks.length) {
      return res.status(404).json({
        success: false,
        message: 'Network not found in coin'
      });
    }

    // Save updated networks
    coin.networks = updatedNetworks;
    await coin.save();

    return res.json({
      success: true,
      data: coin.networks,
      message: `${networkName} network removed successfully`
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
