import mongoose from 'mongoose';import {env} from './env.js';
// Atlas connection strings copied/retyped by hand tend to arrive with two kinds of problems:
// 1) extra query params (e.g. "appName") that the driver rejects outright as unsupported, and
// 2) unencoded special characters in the password (e.g. a literal "@" or ":") which break URI
//    parsing, since those characters are structural separators in a mongodb:// URI.
// Neither is required for this app to function, so we defensively re-encode the credentials and
// drop the query string rather than fail the whole connection over a cosmetic formatting issue.
const sanitizeUri=uri=>{
  const match=uri.match(/^(mongodb(?:\+srv)?:\/\/)([^/?]+)(\/.*)?$/);
  if(!match) return uri.split('?')[0];
  const [,scheme,authority]=match;
  const atIndex=authority.lastIndexOf('@');
  if(atIndex===-1) return `${scheme}${authority.split('?')[0]}`;
  const userinfo=authority.slice(0,atIndex);
  const hostAndQuery=authority.slice(atIndex+1);
  const host=hostAndQuery.split('?')[0];
  const colonIndex=userinfo.indexOf(':');
  if(colonIndex===-1) return `${scheme}${encodeURIComponent(decodeSafely(userinfo))}@${host}`;
  const rawUser=userinfo.slice(0,colonIndex);
  const rawPass=userinfo.slice(colonIndex+1);
  const user=encodeURIComponent(decodeSafely(rawUser));
  const pass=encodeURIComponent(decodeSafely(rawPass));
  return `${scheme}${user}:${pass}@${host}`;
};
// If the value is already percent-encoded, decode it first so we don't double-encode it.
const decodeSafely=value=>{try{return decodeURIComponent(value);}catch{return value;}};
export const connectDB=async()=>{mongoose.set('strictQuery',true);const conn=await mongoose.connect(sanitizeUri(env.mongodbUri));console.log(`MongoDB connected: ${conn.connection.host}`)};
