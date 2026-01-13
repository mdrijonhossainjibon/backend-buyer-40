import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

interface IAdminMethods {
  comparePassword(password: string): Promise<boolean>;
  generateAuthToken(): string;
}

interface IAdminStatics {
  findByUsername(username: string): Promise<IAdminDocument | null>;
  findByEmail(email: string): Promise<IAdminDocument | null>;
  authenticate(identifier: string, password: string): Promise<IAdminDocument | null>;
}

type IAdminDocument = Document<unknown, Record<string, never>, IAdmin> & IAdmin & IAdminMethods;
type IAdminModel = Model<IAdmin, Record<string, never>, IAdminMethods> & IAdminStatics;

export interface IAdmin {
  username: string;
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'moderator';
  lastLogin?: Date;
  createdAt: Date;
  status: 'active' | 'inactive';
  otp?: string;
  otpExpiry?: Date;
  updatedAt: Date;
  fcmToken?: string;
  lastTokenUpdate?: Date;
}

const AdminSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  otp: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
 
  lastLogin: {
    type: Date,
    default: null
  },
  fcmToken: {
    type: String,
    default: null
  },
  lastTokenUpdate: {
    type: Date,
    default: null
  },
  
}, {
  timestamps: true,
  collection: 'admins'
});

 
 
 
 

// Prevent model re-compilation during development
const Admin: IAdminModel = (mongoose.models.Admin as IAdminModel) || mongoose.model<IAdmin, IAdminModel>('Admin', AdminSchema);

export default Admin;
