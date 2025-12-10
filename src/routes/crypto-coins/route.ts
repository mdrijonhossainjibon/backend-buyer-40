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
    status: "active",
    networks: [
      {
        network: "bep20-testnet",
        contractAddress: "0x55d398326f99059fF775485246999027B3197955",
        minDeposit: "10",
        minimumWithdraw: "5",
        withdrawFee: "1",
        fee: "1",
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: "~5 min"
      }
    ]
  },
  {
    id: "bnb",
    name: "Binance Coin",
    symbol: "BNB",
    icon: "/svg/color/bnb.svg",
    status: "active",
    networks: [
      {
        network: "bep20-testnet",
        minDeposit: "0.01",
        minimumWithdraw: "0.005",
        withdrawFee: "0.0005",
        fee: "0.001",
        requiresMemo: false,
        confirmations: 15,
        estimatedTime: "~3 min"
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

export default router;
