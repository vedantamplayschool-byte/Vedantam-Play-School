import mongoose from 'mongoose';import {env} from './env.js';
export const connectDB=async()=>{mongoose.set('strictQuery',true);const conn=await mongoose.connect(env.mongodbUri);console.log(`MongoDB connected: ${conn.connection.host}`)};
