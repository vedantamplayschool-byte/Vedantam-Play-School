import mongoose from 'mongoose';import {env} from './env.js';
// Strip any query-string options (e.g. appName) from the connection string before connecting.
// Atlas connection strings copied/retyped from the dashboard sometimes pick up a stray space or
// casing change in a query param (e.g. "appName" -> "app name"), which the mongodb driver rejects
// outright as an unsupported option. None of these options are required for this app to function,
// so we drop them defensively rather than fail the whole connection over a cosmetic param.
const sanitizeUri=uri=>uri.split('?')[0];
export const connectDB=async()=>{mongoose.set('strictQuery',true);const conn=await mongoose.connect(sanitizeUri(env.mongodbUri));console.log(`MongoDB connected: ${conn.connection.host}`)};
