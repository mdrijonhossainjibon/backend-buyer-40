import mongoose from 'mongoose'
import TaskModel from '../models/Task'
import connectDB from '../config/database'

const sampleTasks = [
  // Telegram Tasks
  {
    platform: 'Telegram',
    title: 'Join Our Official Telegram Channel',
    description: 'Join our official Telegram channel and stay updated with the latest news, announcements, and exclusive content. Get instant notifications about new features and updates!',
    reward: '5.00',
    link: 'https://t.me/buyer40official'
  },
  {
    platform: 'Telegram',
    title: 'Join Buyer40 Community Group',
    description: 'Join our Telegram community group, participate in discussions, connect with other members, and share your experiences. Active members get bonus rewards!',
    reward: '7.50',
    link: 'https://t.me/buyer40community'
  },
  {
    platform: 'Telegram',
    title: 'Join Buyer40 News Channel',
    description: 'Stay informed with our news channel. Get breaking news, market updates, and important announcements delivered directly to your Telegram.',
    reward: '3.00',
    link: 'https://t.me/buyer40news'
  },
  {
    platform: 'Telegram',
    title: 'Join VIP Trading Signals',
    description: 'Get access to exclusive trading signals and market analysis. Join our VIP channel for premium content and expert insights.',
    reward: '10.00',
    link: 'https://t.me/buyer40vip'
  },
  
  // Twitter/X Tasks
  {
    platform: 'Twitter',
    title: 'Follow Us on Twitter/X',
    description: 'Follow our official Twitter account @Buyer40 to stay updated with tweets, announcements, and engage with our community.',
    reward: '4.00',
    link: 'https://twitter.com/buyer40'
  },
  {
    platform: 'Twitter',
    title: 'Retweet Our Pinned Post',
    description: 'Help us spread the word! Retweet our pinned post and tag 3 friends to earn rewards. More engagement = more rewards!',
    reward: '6.00',
    link: 'https://twitter.com/buyer40/status/123456789'
  },
  {
    platform: 'Twitter',
    title: 'Like and Comment on Our Latest Tweet',
    description: 'Show some love! Like and leave a meaningful comment on our latest tweet. Quality comments get bonus rewards.',
    reward: '3.50',
    link: 'https://twitter.com/buyer40'
  },
  
  // YouTube Tasks
  {
    platform: 'YouTube',
    title: 'Subscribe to Our YouTube Channel',
    description: 'Subscribe to our YouTube channel for tutorials, reviews, and exclusive video content. Don\'t forget to hit the notification bell!',
    reward: '8.00',
    link: 'https://youtube.com/@buyer40'
  },
  {
    platform: 'YouTube',
    title: 'Watch and Like Our Introduction Video',
    description: 'Watch our complete introduction video (5 minutes) and give it a thumbs up. Learn about all our features and services!',
    reward: '5.00',
    link: 'https://youtube.com/watch?v=buyer40intro'
  },
  {
    platform: 'YouTube',
    title: 'Comment on Our Latest Video',
    description: 'Watch our latest video and leave a thoughtful comment. Share your feedback and suggestions with us!',
    reward: '4.50',
    link: 'https://youtube.com/@buyer40/videos'
  },
  
  // Facebook Tasks
  {
    platform: 'Facebook',
    title: 'Like Our Facebook Page',
    description: 'Like and follow our official Facebook page to get updates, news, and exclusive offers in your feed.',
    reward: '3.00',
    link: 'https://facebook.com/buyer40'
  },
  {
    platform: 'Facebook',
    title: 'Share Our Facebook Post',
    description: 'Share our latest Facebook post with your friends and help us grow our community. Public shares only!',
    reward: '5.50',
    link: 'https://facebook.com/buyer40/posts/123456'
  },
  
  // Instagram Tasks
  {
    platform: 'Instagram',
    title: 'Follow Us on Instagram',
    description: 'Follow our Instagram account @buyer40 for daily updates, stories, and behind-the-scenes content.',
    reward: '4.00',
    link: 'https://instagram.com/buyer40'
  },
  {
    platform: 'Instagram',
    title: 'Like Our Latest Instagram Post',
    description: 'Show some love! Like our latest Instagram post and help us reach more people.',
    reward: '2.50',
    link: 'https://instagram.com/buyer40'
  },
  {
    platform: 'Instagram',
    title: 'Comment on Our Instagram Reel',
    description: 'Watch our latest Instagram reel and leave a comment. Share your thoughts and engage with our content!',
    reward: '4.00',
    link: 'https://instagram.com/reel/buyer40'
  },
  
  // Discord Tasks
  {
    platform: 'Discord',
    title: 'Join Our Discord Server',
    description: 'Join our Discord community! Chat with team members, get support, and participate in exclusive events and giveaways.',
    reward: '6.00',
    link: 'https://discord.gg/buyer40'
  },
  {
    platform: 'Discord',
    title: 'Verify Your Account on Discord',
    description: 'Complete the verification process on our Discord server to unlock all channels and features.',
    reward: '3.00',
    link: 'https://discord.gg/buyer40'
  },
  
  // TikTok Tasks
  {
    platform: 'TikTok',
    title: 'Follow Us on TikTok',
    description: 'Follow our TikTok account @buyer40 for short-form content, tips, and entertaining videos!',
    reward: '3.50',
    link: 'https://tiktok.com/@buyer40'
  },
  {
    platform: 'TikTok',
    title: 'Like and Share Our TikTok Video',
    description: 'Watch, like, and share our latest TikTok video. Help us go viral and earn rewards!',
    reward: '5.00',
    link: 'https://tiktok.com/@buyer40/video/123456'
  },
  
  // LinkedIn Tasks
  {
    platform: 'LinkedIn',
    title: 'Follow Our LinkedIn Company Page',
    description: 'Connect with us professionally! Follow our LinkedIn page for business updates, job opportunities, and industry insights.',
    reward: '4.50',
    link: 'https://linkedin.com/company/buyer40'
  },
  
  // Reddit Tasks
  {
    platform: 'Reddit',
    title: 'Join Our Subreddit',
    description: 'Join r/Buyer40 on Reddit! Participate in discussions, share experiences, and get community support.',
    reward: '4.00',
    link: 'https://reddit.com/r/buyer40'
  },
  {
    platform: 'Reddit',
    title: 'Upvote Our Reddit Post',
    description: 'Help us gain visibility! Upvote our latest post on Reddit and leave a comment if you\'d like.',
    reward: '3.00',
    link: 'https://reddit.com/r/buyer40/comments/123456'
  }
]

async function insertTasks() {
  try {
    console.log('Connecting to database...')
    
    await connectDB()

    console.log('Database connected!')
    console.log('Inserting tasks...')

    const insertedTasks = await TaskModel.insertMany(sampleTasks)

    console.log(`\n✅ Successfully inserted ${insertedTasks.length} tasks!\n`)
    
    // Group tasks by platform
    const tasksByPlatform = insertedTasks.reduce((acc, task) => {
      if (!acc[task.platform]) {
        acc[task.platform] = []
      }
      acc[task.platform].push(task)
      return acc
    }, {} as Record<string, Array<typeof insertedTasks[0]>>)

    // Display tasks grouped by platform
    for (const platform in tasksByPlatform) {
      const tasks = tasksByPlatform[platform]
      console.log(`\n📱 ${platform} (${tasks.length} tasks):`)
      tasks.forEach((task: typeof insertedTasks[0], index: number) => {
        console.log(`   ${index + 1}. ${task.title}`)
        console.log(`      💰 Reward: ${task.reward} USDT`)
        console.log(`      🔗 Link: ${task.link}`)
        console.log(`      🆔 ID: ${task._id}`)
      })
    }

    // Display summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Summary:')
    console.log(`   Total Tasks: ${insertedTasks.length}`)
    console.log(`   Platforms: ${Object.keys(tasksByPlatform).length}`)
    const totalReward = insertedTasks.reduce((sum, task) => sum + parseFloat(task.reward), 0)
    console.log(`   Total Rewards: ${totalReward.toFixed(2)} USDT`)
    console.log('='.repeat(60) + '\n')

    process.exit(0)
  } catch (error) {
    console.error('Error inserting tasks:', error)
    process.exit(1)
  }
}

insertTasks()
