import { ethers } from 'ethers';
import * as cron from 'node-cron';
import AdminWallet from '../models/AdminWallet';
import { Admin } from 'models';
import CryptoCoin from '../models/CryptoCoin';
import Transaction from '../models/Transaction';
import { getERC20Balance, getNativeBalance, getERC20Decimals, formatNativeBalance } from 'auth-fingerprint';
import firebaseService from './firebaseService';

/**
 * Get recent token transfers for a specific address
 */
async function getRecentTokenTransfers(
  rpcUrl: string, 
  address: string, 
  tokenAddress: string,
  networkId: string,
  networkName: string,
  coinSymbol: string
) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const currentBlock = await provider.getBlockNumber();
  
  const fromBlock = currentBlock - 50;
  const toBlock = currentBlock;

  const incomingFilter = {
    address: tokenAddress,
    fromBlock,
    toBlock,
    topics: [
      ethers.id("Transfer(address,address,uint256)"),
      null,
      ethers.zeroPadValue(address, 32)
    ],
  };

  const outgoingFilter = {
    address: tokenAddress,
    fromBlock,
    toBlock,
    topics: [
      ethers.id("Transfer(address,address,uint256)"),
      ethers.zeroPadValue(address, 32),
      null
    ],
  };

  try {
    const [incomingLogs, outgoingLogs] = await Promise.all([
      provider.getLogs(incomingFilter),
      provider.getLogs(outgoingFilter)
    ]);

    const allLogs = [...incomingLogs, ...outgoingLogs];
    
    if (allLogs.length === 0) {
      return [];
    }

    const decimals = await getERC20Decimals(rpcUrl, tokenAddress);

    const transfers = allLogs.map(log => ({
      from: "0x" + log.topics[1].slice(26),
      to: "0x" + log.topics[2].slice(26),
      value: ethers.formatUnits(log.data, decimals),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      direction: log.topics[2].slice(26).toLowerCase() === address.slice(2).toLowerCase() ? 'incoming' : 'outgoing',
      networkId,
      networkName,
      tokenAddress,
      coinSymbol
    }));

    return transfers;
  } catch (err: any) {
    console.error(`Error fetching transfers for ${coinSymbol} on ${networkName}:`, err.message);
    return [];
  }
}

/**
 * Monitor all active coins and networks dynamically
 */
cron.schedule('*/10 * * * * *', async () => {
  try {
    // Get all active admin wallets
    const adminWallets = await AdminWallet.find({ status: 'active' });
    if (adminWallets.length === 0) return;

    // Get all active coins with token type (non-native coins)
    const coins = await CryptoCoin.find({ isActive: true, isNativeCoin: false });

    for (const adminWallet of adminWallets) {
      for (const coin of coins) {
        // Find networks that this wallet supports
        const supportedNetworks = coin.networks.filter(
          (n) => n.isActive && adminWallet.supportedNetworks.includes(n.id)
        );

        for (const network of supportedNetworks) {
          if (!network.contactAddress || !network.rpcUrl) continue;

          const transfers = await getRecentTokenTransfers(
            network.rpcUrl,
            adminWallet.address,
            network.contactAddress,
            network.id,
            network.name,
            coin.symbol
          );

          for (const transfer of transfers) {
            try {
              // Check if transaction already exists
              const existingTransaction = await Transaction.findOne({ txHash: transfer.txHash });
              if (existingTransaction) {
                continue;
              }

              const amount = parseFloat(transfer.value);

              if (transfer.direction === 'incoming') {
                // Save deposit transaction
                const transactionRecord = new Transaction({
                  txHash: transfer.txHash,
                  type: 'deposit',
                  amount,
                  tokenAddress: transfer.tokenAddress,
                  tokenSymbol: transfer.coinSymbol,
                  fromAddress: transfer.from,
                  toAddress: transfer.to,
                  walletId: adminWallet._id,
                  blockNumber: transfer.blockNumber,
                  networkId: transfer.networkId,
                  networkName: transfer.networkName,
                  status: 'pending',
                  confirmations: 1,
                });
                await transactionRecord.save();

                // Send notification
                const admin = await Admin.findOne({});
                if (admin && admin.fcmToken) {
                  await firebaseService.sendToDevice(
                    admin.fcmToken,
                    'New Deposit Received',
                    `${amount} ${transfer.coinSymbol} deposited on ${transfer.networkName}`,
                    {
                      type: 'deposit_received',
                      timestamp: new Date().toISOString(),
                      screen: 'DepositDetails',
                      userId: admin._id.toString(),
                      depositId: (transactionRecord._id as any).toString(),
                      amount: amount.toString(),
                      symbol: transfer.coinSymbol,
                      txHash: transfer.txHash,
                      networkId: transfer.networkId
                    }
                  );
                }

                console.log(`✅ Deposit: ${amount} ${transfer.coinSymbol} on ${transfer.networkName}`);

              } else if (transfer.direction === 'outgoing') {
                // Save withdrawal transaction
                const transactionRecord = new Transaction({
                  txHash: transfer.txHash,
                  type: 'withdraw',
                  amount,
                  tokenAddress: transfer.tokenAddress,
                  tokenSymbol: transfer.coinSymbol,
                  fromAddress: transfer.from,
                  toAddress: transfer.to,
                  walletId: adminWallet._id,
                  blockNumber: transfer.blockNumber,
                  networkId: transfer.networkId,
                  networkName: transfer.networkName,
                  status: 'confirmed',
                  confirmations: 1,
                });
                await transactionRecord.save();

                // Send notification
                const admin = await Admin.findOne({});
                if (admin && admin.fcmToken) {
                  await firebaseService.sendToDevice(
                    admin.fcmToken,
                    'Withdrawal Processed',
                    `${amount} ${transfer.coinSymbol} withdrawn on ${transfer.networkName}`,
                    {
                      type: 'withdrawal_processed',
                      timestamp: new Date().toISOString(),
                      screen: 'WithdrawDetails',
                      userId: admin._id.toString(),
                      withdrawId: (transactionRecord._id as any).toString(),
                      amount: amount.toString(),
                      symbol: transfer.coinSymbol,
                      txHash: transfer.txHash,
                      networkId: transfer.networkId
                    }
                  );
                }

                console.log(`✅ Withdrawal: ${amount} ${transfer.coinSymbol} on ${transfer.networkName}`);
              }
            } catch (txError) {
              console.error('Error processing transaction:', txError);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in blockchain monitoring cron job:', error);
  }
});

/**
 * Monitor native coin balances (ETH, BNB, etc.)
 */
cron.schedule('*/30 * * * * *', async () => {
  try {
    const adminWallets = await AdminWallet.find({ status: 'active' });
    if (adminWallets.length === 0) return;

    // Get native coins
    const nativeCoins = await CryptoCoin.find({ isActive: true, isNativeCoin: true });

    for (const adminWallet of adminWallets) {
      for (const coin of nativeCoins) {
        const supportedNetworks = coin.networks.filter(
          (n) => n.isActive && adminWallet.supportedNetworks.includes(n.id)
        );

        for (const network of supportedNetworks) {
          if (!network.rpcUrl) continue;

          try {
            const balance = await getNativeBalance(network.rpcUrl, adminWallet.address);
            const formatted = parseFloat(formatNativeBalance(balance));

            console.log(`${coin.symbol} balance on ${network.name}: ${formatted}`);
          } catch (err: any) {
            console.error(`Error checking ${coin.symbol} on ${network.name}:`, err.message);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("Native balance monitoring error:", err.message);
  }
});
