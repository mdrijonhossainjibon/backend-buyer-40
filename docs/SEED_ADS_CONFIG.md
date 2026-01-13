# Ads Configuration Seed Script

## Overview
Created a seed script to initialize the ads configuration in the database with sensible defaults.

## Files Created
- **`src/scripts/seedAdsConfig.ts`** - Seed script for ads configuration

## Files Modified
- **`package.json`** - Added `seed:ads` script

## Usage

Run the seed script using:
```bash
yarn seed:ads
```

## Default Configuration

The script creates the following default ads configuration:

| Setting | Default Value | Description |
|---------|--------------|-------------|
| `enableGigaPubAds` | `true` | Enable/disable GigaPub ads |
| `gigaPubAppId` | From env or empty | GigaPub application ID |
| `defaultAdsReward` | `0.01` USDT | Reward per ad view |
| `adsWatchLimit` | `10` | Maximum ads per day per user |
| `adsRewardMultiplier` | `1.0x` | Multiplier for ad rewards |
| `minWatchTime` | `30` seconds | Minimum time to watch an ad |
| `monetagEnabled` | `false` | Enable/disable Monetag ads |
| `monetagZoneId` | From env or empty | Monetag zone ID |

## Environment Variables

To configure the ads properly, add these to your `.env` file:

```env
GIGAPUB_APP_ID=your_gigapub_app_id_here
MONETAG_ZONE_ID=your_monetag_zone_id_here
```

## Features

✅ **Smart Detection** - Checks if configuration already exists
✅ **Environment Support** - Uses environment variables when available
✅ **Detailed Output** - Shows complete configuration details
✅ **Safe Defaults** - Sensible default values for all settings
✅ **Helpful Tips** - Provides guidance on next steps

## Script Behavior

1. **First Run**: Creates new ads configuration with defaults
2. **Subsequent Runs**: Detects existing configuration and displays current settings
3. **Error Handling**: Graceful error handling with clear messages

## Example Output

```
🔄 Connecting to database...
🔗 Database connected!
📝 Creating default ads configuration...

✅ Successfully created ads configuration!

============================================================
📊 Ads Configuration Details:
============================================================
   🆔 ID: 507f1f77bcf86cd799439011
   ✅ Enable GigaPub Ads: true
   🔑 GigaPub App ID: Not set (add to .env)
   💰 Default Ads Reward: 0.01 USDT
   📊 Ads Watch Limit: 10 per day
   📈 Ads Reward Multiplier: 1x
   ⏱️  Min Watch Time: 30 seconds
   🎯 Monetag Enabled: false
   🔑 Monetag Zone ID: Not set (add to .env)
   📅 Created At: 2026-01-14T01:42:00.000Z
============================================================

💡 Tips:
   • Set GIGAPUB_APP_ID in your .env file to enable GigaPub ads
   • Set MONETAG_ZONE_ID in your .env file to enable Monetag ads
   • Users can watch up to 10 ads per day
   • Each ad view rewards 0.01 USDT
   • Minimum watch time is 30 seconds
```

## Related Models

- **AdsSettings** (`src/models/AdsSettings.ts`) - Mongoose model for ads configuration

## Next Steps

1. ✅ Run `yarn seed:ads` to create the configuration
2. Add `GIGAPUB_APP_ID` to your `.env` file
3. Add `MONETAG_ZONE_ID` to your `.env` file (optional)
4. Update settings via admin panel or database as needed
