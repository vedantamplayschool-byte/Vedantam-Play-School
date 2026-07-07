import mongoose from 'mongoose';import bcrypt from 'bcrypt';
const adminSchema=new mongoose.Schema({name:{type:String,required:true,trim:true,maxlength:80},email:{type:String,required:true,unique:true,lowercase:true,trim:true,index:true},password:{type:String,required:true,minlength:8,select:false},role:{type:String,enum:['super_admin','admin'],default:'admin'},isActive:{type:Boolean,default:true},lastLoginAt:Date},{timestamps:true});
adminSchema.pre('save',async function(next){if(!this.isModified('password'))return next();this.password=await bcrypt.hash(this.password,12);next()});
adminSchema.methods.comparePassword=function(candidate){return bcrypt.compare(candidate,this.password)};export default mongoose.model('Admin',adminSchema);
