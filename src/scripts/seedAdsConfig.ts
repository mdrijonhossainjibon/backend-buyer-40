import mongoose from 'mongoose'
import AdsSettings from '../models/AdsSettings'
import connectDB from '../config/database'

const defaultAdsConfig = {
    enableGigaPubAds: true,
    gigaPubAppId: process.env.GIGAPUB_APP_ID || '',
    defaultAdsReward: 0.01,
    adsWatchLimit: 10,
    adsRewardMultiplier: 1.0,
    minWatchTime: 30,
    monetagEnabled: false,
    monetagZoneId: process.env.MONETAG_ZONE_ID || ''
}

async function seedAdsConfig() {
    try {
        console.log('🔄 Connecting to database...')

        await connectDB()

        console.log('🔗 Database connected!')

        // Check if ads config already exists
        const existingConfig = await AdsSettings.findOne()

        if (existingConfig) {
            console.log('\n⚠️  Ads configuration already exists!')
            console.log('📋 Current configuration:')
            console.log('='.repeat(60))
            console.log(`   Enable GigaPub Ads: ${existingConfig.enableGigaPubAds}`)
            console.log(`   GigaPub App ID: ${existingConfig.gigaPubAppId || 'Not set'}`)
            console.log(`   Default Ads Reward: ${existingConfig.defaultAdsReward} USDT`)
            console.log(`   Ads Watch Limit: ${existingConfig.adsWatchLimit} per day`)
            console.log(`   Ads Reward Multiplier: ${existingConfig.adsRewardMultiplier}x`)
            console.log(`   Min Watch Time: ${existingConfig.minWatchTime} seconds`)
            console.log(`   Monetag Enabled: ${existingConfig.monetagEnabled}`)
            console.log(`   Monetag Zone ID: ${existingConfig.monetagZoneId || 'Not set'}`)
            console.log('='.repeat(60))
            console.log('\n💡 To update the configuration, delete the existing one first or update it manually.')
            process.exit(0)
        }

        console.log('📝 Creating default ads configuration...')

        const adsConfig = await AdsSettings.create(defaultAdsConfig)

        console.log('\n✅ Successfully created ads configuration!\n')
        console.log('='.repeat(60))
        console.log('📊 Ads Configuration Details:')
        console.log('='.repeat(60))
        console.log(`   🆔 ID: ${adsConfig._id}`)
        console.log(`   ✅ Enable GigaPub Ads: ${adsConfig.enableGigaPubAds}`)
        console.log(`   🔑 GigaPub App ID: ${adsConfig.gigaPubAppId || 'Not set (add to .env)'}`)
        console.log(`   💰 Default Ads Reward: ${adsConfig.defaultAdsReward} USDT`)
        console.log(`   📊 Ads Watch Limit: ${adsConfig.adsWatchLimit} per day`)
        console.log(`   📈 Ads Reward Multiplier: ${adsConfig.adsRewardMultiplier}x`)
        console.log(`   ⏱️  Min Watch Time: ${adsConfig.minWatchTime} seconds`)
        console.log(`   🎯 Monetag Enabled: ${adsConfig.monetagEnabled}`)
        console.log(`   🔑 Monetag Zone ID: ${adsConfig.monetagZoneId || 'Not set (add to .env)'}`)
        console.log(`   📅 Created At: ${adsConfig.createdAt}`)
        console.log('='.repeat(60))

        console.log('\n💡 Tips:')
        console.log('   • Set GIGAPUB_APP_ID in your .env file to enable GigaPub ads')
        console.log('   • Set MONETAG_ZONE_ID in your .env file to enable Monetag ads')
        console.log('   • Users can watch up to ' + adsConfig.adsWatchLimit + ' ads per day')
        console.log('   • Each ad view rewards ' + adsConfig.defaultAdsReward + ' USDT')
        console.log('   • Minimum watch time is ' + adsConfig.minWatchTime + ' seconds\n')

        process.exit(0)
    } catch (error) {
        console.error('❌ Error seeding ads configuration:', error)
        process.exit(1)
    }
}

seedAdsConfig()
