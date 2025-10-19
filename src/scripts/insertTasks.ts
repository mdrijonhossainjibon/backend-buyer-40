import mongoose from 'mongoose'
import TaskModel from '../models/Task'
import connectDB from '../config/database'

const sampleTasks = [
  {
    platform: 'Telegram',
    title: 'Join Our Telegram Channel',
    description: 'Join our official Telegram channel and stay updated with the latest news, announcements, and exclusive content.',
    reward: '50',
    link: 'https://t.me/yourchannel'
  },
  {
    platform: 'Telegram',
    title: 'Follow Telegram Group',
    description: 'Join our Telegram community group, participate in discussions, and connect with other members.',
    reward: '75',
    link: 'https://t.me/yourgroup'
  }
]

async function insertTasks() {
  try {
    console.log('Connecting to database...')
    
    await connectDB()

    console.log('Database connected!')
    console.log('Inserting tasks...')

    const insertedTasks = await TaskModel.insertMany(sampleTasks)

    console.log(`✓ Successfully inserted ${insertedTasks.length} tasks:`)
    insertedTasks.forEach((task, index) => {
      console.log(`\n${index + 1}. ${task.title}`)
      console.log(`   ID: ${task._id}`)
      console.log(`   Platform: ${task.platform}`)
      console.log(`   Reward: ${task.reward}`)
      console.log(`   Link: ${task.link}`)
    })

    process.exit(0)
  } catch (error) {
    console.error('Error inserting tasks:', error)
    process.exit(1)
  }
}

insertTasks()
