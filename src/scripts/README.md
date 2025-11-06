# Database Seed Scripts

This directory contains scripts to populate the database with initial/sample data.

## Available Scripts

### 1. Seed Tasks (`insertTasks.ts`)
Seeds the database with sample social media tasks across multiple platforms.

**Platforms included:**
- Telegram (4 tasks)
- Twitter/X (3 tasks)
- YouTube (3 tasks)
- Facebook (2 tasks)
- Instagram (3 tasks)
- Discord (2 tasks)
- TikTok (2 tasks)
- LinkedIn (1 task)
- Reddit (2 tasks)

**Total:** 22 tasks with rewards ranging from 2.50 to 10.00 USDT

**Run:**
```bash
npm run seed:tasks
```

### 2. Seed Crypto Coins (`seedCryptoCoins.ts`)
Seeds the database with supported cryptocurrencies and their network configurations.

**Run:**
```bash
npm run seed:crypto
```

### 3. Seed Conversion Rates (`seedConversionRates.ts`)
Seeds the database with currency conversion rates.

**Run:**
```bash
npm run seed:rates
```

## Usage

### Running Individual Seeds
```bash
# Seed tasks only
npm run seed:tasks

# Seed crypto coins only
npm run seed:crypto

# Seed conversion rates only
npm run seed:rates
```

### Running All Seeds
```bash
npm run seed:tasks && npm run seed:crypto && npm run seed:rates
```

## Important Notes

⚠️ **Warning:** These scripts will clear existing data in their respective collections before inserting new data.

- `insertTasks.ts` - Uses `insertMany()` (does not clear existing data by default)
- `seedCryptoCoins.ts` - Uses `deleteMany()` then `insertMany()` (clears existing data)
- `seedConversionRates.ts` - Check the script for its behavior

## Customization

### Adding More Tasks

Edit `insertTasks.ts` and add new task objects to the `sampleTasks` array:

```typescript
{
  platform: 'Platform Name',
  title: 'Task Title',
  description: 'Detailed task description',
  reward: '5.00', // Amount in USDT
  link: 'https://link-to-task.com'
}
```

### Modifying Existing Tasks

Simply edit the task objects in the `sampleTasks` array and re-run the seed script.

## Environment Variables

Make sure your `.env` file is configured with:
```
MONGODB_URI=your_mongodb_connection_string
```

## Troubleshooting

### Connection Issues
- Ensure MongoDB is running
- Verify `MONGODB_URI` in your `.env` file
- Check network connectivity

### Duplicate Key Errors
- Clear the collection manually before re-seeding
- Or modify the script to handle duplicates

### TypeScript Errors
- Run `npm install` to ensure all dependencies are installed
- Check that `tsconfig.json` is properly configured
