import { Router, Request, Response } from "express";
import CryptoCoin from "models/CryptoCoin";

const router = Router();

// ================================
// Default crypto coins with networks
// ================================
const DEFAULT_CRYPTO_COINS = [
  {
    id: "usdt",
    name: "Tether",
    symbol: "USDT",
    icon: "/svg/color/usdt.svg",
    status: "active" as const,
    networks: [
      {
        id: "usdt-bep20-testnet",
        name: "BEP20 (BSC Testnet)",
        network: "bep20-testnet",
        isDefault: true,
        contactAddress: "0x55d398326f99059fF775485246999027B3197955",
        minDeposit: "10",
        minimumWithdraw: "5",
        withdrawFee: "1",
        fee: "1",
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: "~5 min",
        rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
        type: "BEP20",
        isActive: true
      },
      {
        id: "usdt-bep20-mainnet",
        name: "BEP20 (BSC Mainnet)",
        network: "bep20-mainnet",
        isDefault: false,
        contactAddress: "0x55d398326f99059fF775485246999027B3197955",
        minDeposit: "10",
        minimumWithdraw: "5",
        withdrawFee: "1",
        fee: "1",
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: "~5 min",
        rpcUrl: "https://bsc-dataseed1.binance.org/",
        type: "BEP20",
        isActive: true
      }
    ]
  },
  {
    id: "bnb",
    name: "Binance Coin",
    symbol: "BNB",
    icon: "/svg/color/bnb.svg",
    status: "active" as const,
    networks: [
      {
        id: "bnb-bep20-testnet",
        name: "BEP20 (BSC Testnet)",
        network: "bep20-testnet",
        isDefault: true,
        minDeposit: "0.01",
        minimumWithdraw: "0.005",
        withdrawFee: "0.0005",
        fee: "0.001",
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: "~3 min",
        rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
        type: "Native",
        isActive: true
      },
      {
        id: "bnb-bep20-mainnet",
        name: "BEP20 (BSC Mainnet)",
        network: "bep20-mainnet",
        isDefault: false,
        minDeposit: "0.01",
        minimumWithdraw: "0.005",
        withdrawFee: "0.0005",
        fee: "0.001",
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: "~3 min",
        rpcUrl: "https://bsc-dataseed1.binance.org/",
        type: "Native",
        isActive: true
      }
    ]
  },
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    icon: "/svg/color/eth.svg",
    status: "active" as const,
    networks: [
      {
        id: "eth-erc20-mainnet",
        name: "ERC20 (Ethereum Mainnet)",
        network: "erc20-mainnet",
        isDefault: true,
        minDeposit: "0.01",
        minimumWithdraw: "0.005",
        withdrawFee: "0.002",
        fee: "0.002",
        requiresMemo: false,
        confirmations: 12,
        estimatedTime: "~10 min",
        rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
        type: "Native",
        isActive: true
      }
    ]
  },
  {
    id: "trx",
    name: "Tron",
    symbol: "TRX",
    icon: "/svg/color/trx.svg",
    status: "active" as const,
    networks: [
      {
        id: "trx-trc20-mainnet",
        name: "TRC20 (Tron Mainnet)",
        network: "trc20-mainnet",
        isDefault: true,
        minDeposit: "10",
        minimumWithdraw: "5",
        withdrawFee: "1",
        fee: "1",
        requiresMemo: false,
        confirmations: 20,
        estimatedTime: "~3 min",
        rpcUrl: "https://api.trongrid.io",
        type: "Native",
        isActive: true
      }
    ]
  }
];

// ================================
// GET ALL COINS
// ================================
router.get("/crypto-coins", async (req: Request, res: Response) => {
  try {
    const count = await CryptoCoin.countDocuments();

    // Insert defaults if empty
    if (count === 0) {
      await CryptoCoin.insertMany(DEFAULT_CRYPTO_COINS);
    }

    const coins = await CryptoCoin.find().sort({ name: 1 }).lean();

    return res.json({
      success: true,
      data: coins,
      message: "Crypto coins fetched successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// GET SINGLE COIN
// ================================
router.get("/crypto-coins/:id", async (req: Request, res: Response) => {
  try {
    const coin = await CryptoCoin.findOne({ id: req.params.id }).lean();

    if (!coin)
      return res.status(404).json({ success: false, message: "Crypto coin not found" });

    return res.json({
      success: true,
      data: coin,
      message: "Crypto coin fetched successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// ADMIN: CREATE COIN (with networks)
// ================================
router.post("/admin/crypto-coins", async (req: Request, res: Response) => {
  try {
    const { id, name, symbol, icon, status, networks } = req.body;

    if (!id || !name || !symbol || !icon || !networks || networks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields or networks array"
      });
    }

    const exists = await CryptoCoin.findOne({ id });
    if (exists)
      return res.status(400).json({ success: false, message: "Coin ID already exists" });

    const coin = new CryptoCoin({
      id,
      name,
      symbol: symbol.toUpperCase(),
      icon,
      status: status || "active",
      networks
    });

    await coin.save();

    return res.json({
      success: true,
      data: coin,
      message: "Crypto coin created successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// ADMIN: UPDATE COIN
// ================================
router.put("/admin/crypto-coins/:id", async (req: Request, res: Response) => {
  try {
    const coin = await CryptoCoin.findOne({ id: req.params.id });

    if (!coin)
      return res.status(404).json({ success: false, message: "Crypto coin not found" });

    const { name, symbol, icon, status, networks } = req.body;

    if (name !== undefined) coin.name = name;
    if (symbol !== undefined) coin.symbol = symbol.toUpperCase();
    if (icon !== undefined) coin.icon = icon;
    if (status !== undefined) coin.status = status;

    if (networks !== undefined && Array.isArray(networks)) {
      coin.networks = networks; // replace the whole network list
    }

    await coin.save();

    return res.json({
      success: true,
      data: coin,
      message: "Crypto coin updated successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// ADMIN: DELETE COIN
// ================================
router.delete("/admin/crypto-coins/:id", async (req: Request, res: Response) => {
  try {
    const coin = await CryptoCoin.findOneAndDelete({ id: req.params.id });

    if (!coin)
      return res.status(404).json({ success: false, message: "Crypto coin not found" });

    return res.json({
      success: true,
      message: "Crypto coin deleted successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// GET ACTIVE COINS ONLY
// ================================
router.get("/crypto-coins/active/list", async (req: Request, res: Response) => {
  try {
    const coins = await CryptoCoin.find({ status: "active" })
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      data: coins,
      count: coins.length,
      message: "Active crypto coins fetched successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// GET COINS BY NETWORK
// ================================
router.get("/crypto-coins/network/:networkId", async (req: Request, res: Response) => {
  try {
    const { networkId } = req.params;

    const coins = await CryptoCoin.find({
      "networks.network": networkId,
      status: "active"
    }).lean();

    return res.json({
      success: true,
      data: coins,
      count: coins.length,
      message: `Coins supporting ${networkId} network fetched successfully`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// ADMIN: TOGGLE COIN STATUS
// ================================
router.patch("/admin/crypto-coins/:id/toggle-status", async (req: Request, res: Response) => {
  try {
    const coin = await CryptoCoin.findOne({ id: req.params.id });

    if (!coin)
      return res.status(404).json({ success: false, message: "Crypto coin not found" });

    coin.status = coin.status === "active" ? "disabled" : "active";
    await coin.save();

    return res.json({
      success: true,
      data: coin,
      message: `Crypto coin ${coin.status === "active" ? "activated" : "disabled"} successfully`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// ADMIN: ADD NETWORK TO COIN
// ================================
router.post("/admin/crypto-coins/:id/networks", async (req: Request, res: Response) => {
  try {
    const coin = await CryptoCoin.findOne({ id: req.params.id });

    if (!coin)
      return res.status(404).json({ success: false, message: "Crypto coin not found" });

    const networkData = req.body;

    // Validate required network fields
    if (!networkData.id || !networkData.name || !networkData.network || !networkData.rpcUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required network fields (id, name, network, rpcUrl)"
      });
    }

    // Check if network already exists
    const networkExists = coin.networks.some(n => n.id === networkData.id);
    if (networkExists) {
      return res.status(400).json({
        success: false,
        message: "Network with this ID already exists for this coin"
      });
    }

    coin.networks.push(networkData);
    await coin.save();

    return res.json({
      success: true,
      data: coin,
      message: "Network added successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// ADMIN: UPDATE NETWORK IN COIN
// ================================
router.put("/admin/crypto-coins/:coinId/networks/:networkId", async (req: Request, res: Response) => {
  try {
    const { coinId, networkId } = req.params;
    const coin = await CryptoCoin.findOne({ id: coinId });

    if (!coin)
      return res.status(404).json({ success: false, message: "Crypto coin not found" });

    const networkIndex = coin.networks.findIndex(n => n.id === networkId);
    if (networkIndex === -1) {
      return res.status(404).json({ success: false, message: "Network not found" });
    }

    // Update network fields
    Object.assign(coin.networks[networkIndex], req.body);

    await coin.save();

    return res.json({
      success: true,
      data: coin,
      message: "Network updated successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// ADMIN: DELETE NETWORK FROM COIN
// ================================
router.delete("/admin/crypto-coins/:coinId/networks/:networkId", async (req: Request, res: Response) => {
  try {
    const { coinId, networkId } = req.params;
    const coin = await CryptoCoin.findOne({ id: coinId });

    if (!coin)
      return res.status(404).json({ success: false, message: "Crypto coin not found" });

    const initialLength = coin.networks.length;
    coin.networks = coin.networks.filter(n => n.id !== networkId);

    if (coin.networks.length === initialLength) {
      return res.status(404).json({ success: false, message: "Network not found" });
    }

    if (coin.networks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the last network. At least one network is required."
      });
    }

    await coin.save();

    return res.json({
      success: true,
      data: coin,
      message: "Network deleted successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// ADMIN: TOGGLE NETWORK STATUS
// ================================
router.patch("/admin/crypto-coins/:coinId/networks/:networkId/toggle", async (req: Request, res: Response) => {
  try {
    const { coinId, networkId } = req.params;
    const coin = await CryptoCoin.findOne({ id: coinId });

    if (!coin)
      return res.status(404).json({ success: false, message: "Crypto coin not found" });

    const network = coin.networks.find(n => n.id === networkId);
    if (!network) {
      return res.status(404).json({ success: false, message: "Network not found" });
    }

    network.isActive = !network.isActive;
    await coin.save();

    return res.json({
      success: true,
      data: coin,
      message: `Network ${network.isActive ? "activated" : "deactivated"} successfully`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================================
// GET CRYPTO STATISTICS
// ================================
router.get("/crypto-coins/stats/overview", async (req: Request, res: Response) => {
  try {
    const totalCoins = await CryptoCoin.countDocuments();
    const activeCoins = await CryptoCoin.countDocuments({ status: "active" });
    const disabledCoins = await CryptoCoin.countDocuments({ status: "disabled" });

    const coins = await CryptoCoin.find().lean();
    const totalNetworks = coins.reduce((sum, coin) => sum + coin.networks.length, 0);
    const activeNetworks = coins.reduce((sum, coin) =>
      sum + coin.networks.filter(n => n.isActive).length, 0
    );

    // Get unique network types
    const networkTypes = new Set<string>();
    coins.forEach(coin => {
      coin.networks.forEach(network => {
        if (network.network) networkTypes.add(network.network);
      });
    });

    return res.json({
      success: true,
      data: {
        coins: {
          total: totalCoins,
          active: activeCoins,
          disabled: disabledCoins
        },
        networks: {
          total: totalNetworks,
          active: activeNetworks,
          inactive: totalNetworks - activeNetworks,
          uniqueTypes: Array.from(networkTypes)
        }
      },
      message: "Statistics fetched successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
