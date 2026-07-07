import mongoose from 'mongoose';
const schema=new mongoose.Schema({email:{type:String,required:true,unique:true,lowercase:true,trim:true,index:true},isActive:{type:Boolean,default:true,index:true},source:{type:String,default:'website'}},{timestamps:true});export default mongoose.model('Newsletter',schema);
