import mongoose, { Schema, Document } from 'mongoose'
 

export interface ITask extends Document {
  platform: string
  title: string
  description: string
  reward: string
  link: string
  createdAt: Date
  updatedAt: Date
}

const TaskSchema = new Schema<ITask>({
  platform: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  reward: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'tasks'
})

const TaskModel = (mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema))

export default TaskModel
