// Message type definitions for socket communication

export interface WithdrawalData {
  withdrawalId: string;
  coinId: string;
  coinSymbol: string;
  network: string;
  address: string;
  amount: string;
}

export interface InitiateWithdrawalMessage {
  type: 'INITIATE_WITHDRAWAL';
  data: WithdrawalData;
}

export interface WithdrawalInitiatedResponse {
  type: 'WITHDRAWAL_INITIATED';
  transactionId: string;
  withdrawalId: string;
  status: 'initiated';
}

export interface WithdrawalProcessingResponse {
  type: 'WITHDRAWAL_PROCESSING';
  transactionId: string;
  status: 'processing';
  confirmations?: number;
}

export interface WithdrawalPendingResponse {
  type: 'WITHDRAWAL_PENDING';
  transactionId: string;
  confirmations: number;
  requiredConfirmations: number;
}

export interface WithdrawalSuccessResponse {
  type: 'WITHDRAWAL_SUCCESS';
  transactionId: string;
  withdrawalId: string;
  status: 'completed';
  blockchainTxHash: string;
}

export interface WithdrawalFailedResponse {
  type: 'WITHDRAWAL_FAILED';
  withdrawalId: string;
  error: string;
  status: 'failed';
}

export interface ConnectedResponse {
  type: 'CONNECTED';
  clientId: string;
  message: string;
}

export interface ErrorResponse {
  type: 'ERROR';
  error: string;
}

export interface SubscribeBalanceMessage {
  type: 'SUBSCRIBE_BALANCE';
  userId: number;
}

export interface UnsubscribeBalanceMessage {
  type: 'UNSUBSCRIBE_BALANCE';
  userId: number;
}

export interface BalanceChangeResponse {
  type: 'BALANCE_CHANGED';
  userId: number;
  balanceTK: number;
  totalEarned: number;
  withdrawnAmount: number;
  changeAmount: number;
  changeType: 'earned' | 'withdrawn' | 'bonus' | 'refund';
  timestamp: Date;
}

export interface BalanceSubscribedResponse {
  type: 'BALANCE_SUBSCRIBED';
  userId: number;
  currentBalance: number;
  message: string;
}

export interface BalanceUnsubscribedResponse {
  type: 'BALANCE_UNSUBSCRIBED';
  userId: number;
  message: string;
}

export interface BalanceSimulationSuccessResponse {
  type: 'BALANCE_SIMULATION_SUCCESS';
  userId: number;
  changeAmount: number;
  changeType: 'earned' | 'withdrawn' | 'bonus' | 'refund';
  newBalance: number;
  message: string;
}

export interface SimulateBalanceChangeMessage {
  userId: number;
  changeAmount: number;
  changeType: 'earned' | 'withdrawn' | 'bonus' | 'refund';
}
