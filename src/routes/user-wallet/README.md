# User Wallet API Routes

This module provides comprehensive API endpoints for managing user wallet operations including balance retrieval, updates, and summaries.

## Base URL
```
/api/v1/user-wallet
```

## Endpoints

### 1. Get User Wallet Details
**GET** `/api/v1/user-wallet/{userId}`

Retrieve complete wallet information including balances, locked amounts, and transaction history.

**Parameters:**
- `userId` (path, required): The user ID (MongoDB ObjectId)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": 1001,
    "balances": {
      "xp": 5234.50,
      "usdt": 1250.75,
      "spin": 500
    },
    "locked": {
      "xp": 1000,
      "usdt": 100,
      "spin": 50
    },
    "available": {
      "xp": 4234.50,
      "usdt": 1150.75,
      "spin": 450
    },
    "totalEarned": {
      "xp": 10000,
      "usdt": 2000,
      "spin": 1000
    },
    "totalSpent": {
      "xp": 4765.50,
      "usdt": 749.25,
      "spin": 500
    },
    "lastTransaction": "2025-12-04T12:32:11.000Z",
    "createdAt": "2025-01-14T10:12:45.000Z",
    "updatedAt": "2025-12-04T12:32:11.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid user ID
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

### 2. Update User Wallet Balance
**PUT** `/api/v1/user-wallet/{userId}/update-balance`

Update available and locked balances for a specific asset.

**Parameters:**
- `userId` (path, required): The user ID (MongoDB ObjectId)

**Request Body:**
```json
{
  "asset": "xp",
  "availableBalance": 5000,
  "lockedBalance": 1000
}
```

**Body Parameters:**
- `asset` (required): Asset type - one of: `xp`, `usdt`, `spin`
- `availableBalance` (required): New available balance amount (must be >= 0)
- `lockedBalance` (required): New locked balance amount (must be >= 0)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Updated XP balance successfully",
  "data": {
    "userId": 1001,
    "asset": "XP",
    "balances": {
      "xp": 5000,
      "usdt": 1250.75,
      "spin": 500
    },
    "locked": {
      "xp": 1000,
      "usdt": 100,
      "spin": 50
    },
    "available": {
      "xp": 4000,
      "usdt": 1150.75,
      "spin": 450
    },
    "lastTransaction": "2025-12-04T14:32:11.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid parameters or missing required fields
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

### 3. Get Wallet Summary
**GET** `/api/v1/user-wallet/{userId}/summary`

Get a quick summary of wallet balances and totals.

**Parameters:**
- `userId` (path, required): The user ID (MongoDB ObjectId)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": 1001,
    "totalBalance": {
      "xp": 6234.50,
      "usdt": 1350.75,
      "spin": 550
    },
    "available": {
      "xp": 5234.50,
      "usdt": 1250.75,
      "spin": 500
    },
    "locked": {
      "xp": 1000,
      "usdt": 100,
      "spin": 50
    },
    "totalEarned": {
      "xp": 10000,
      "usdt": 2000,
      "spin": 1000
    },
    "totalSpent": {
      "xp": 3765.50,
      "usdt": 649.25,
      "spin": 450
    },
    "lastTransaction": "2025-12-04T12:32:11.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid user ID
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

## Asset Types

The API supports three asset types:

| Asset | Description |
|-------|-------------|
| `xp` | Experience Points |
| `usdt` | USDT Stablecoin |
| `spin` | Spin Tokens for Wheel |

---

## Balance Structure

Each wallet maintains the following balance information:

- **balances**: Available balance for each asset
- **locked**: Locked balance (pending swaps/withdrawals) for each asset
- **available**: Calculated as `balances - locked` for each asset
- **totalEarned**: Total earned amount for each asset (cumulative)
- **totalSpent**: Total spent amount for each asset (cumulative)

---

## Usage Examples

### Using cURL

**Get wallet:**
```bash
curl -X GET http://localhost:5000/api/v1/user-wallet/507f1f77bcf86cd799439011
```

**Update balance:**
```bash
curl -X PUT http://localhost:5000/api/v1/user-wallet/507f1f77bcf86cd799439011/update-balance \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "xp",
    "availableBalance": 5000,
    "lockedBalance": 1000
  }'
```

**Get summary:**
```bash
curl -X GET http://localhost:5000/api/v1/user-wallet/507f1f77bcf86cd799439011/summary
```

### Using JavaScript/Axios

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const userId = '507f1f77bcf86cd799439011';

// Get wallet
const wallet = await axios.get(`${API_URL}/v1/user-wallet/${userId}`);
console.log(wallet.data.data);

// Update balance
const updated = await axios.put(
  `${API_URL}/v1/user-wallet/${userId}/update-balance`,
  {
    asset: 'xp',
    availableBalance: 5000,
    lockedBalance: 1000
  }
);
console.log(updated.data.data);

// Get summary
const summary = await axios.get(`${API_URL}/v1/user-wallet/${userId}/summary`);
console.log(summary.data.data);
```

---

## Integration with React Native

The API is integrated with the Redux store in the React Native app:

1. **Actions**: Dispatch `fetchUserWallet(userId)` to fetch wallet data
2. **Saga**: Automatically handles API calls and updates Redux state
3. **Selectors**: Use `selectUserWalletData`, `selectUserWalletLoading`, etc. to access state

**Example:**
```typescript
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserWallet, selectUserWalletData } from '../store/userWallet';

export function MyComponent() {
  const dispatch = useDispatch();
  const wallet = useSelector(selectUserWalletData);

  useEffect(() => {
    dispatch(fetchUserWallet(userId));
  }, [userId, dispatch]);

  return <Text>{wallet?.balances.xp}</Text>;
}
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (user or wallet not found)
- `500`: Internal Server Error

---

## Notes

- User wallets are automatically created on first access if they don't exist
- All monetary amounts are stored as numbers (not strings)
- Timestamps are returned in ISO 8601 format
- The `available` balance is calculated as `balances - locked` for each asset
- All balance updates are atomic and include transaction timestamps
