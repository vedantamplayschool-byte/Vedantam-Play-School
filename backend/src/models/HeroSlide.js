import mongoose from 'mongoose';
const schema=new mongoose.Schema({title:{type:String,required:true,trim:true},subtitle:{type:String,trim:true},badge:{type:String,trim:true},imageUrl:String,ctaText:String,ctaLink:String,isActive:{type:Boolean,default:true,index:true},displayOrder:{type:Number,default:0,index:true}},{timestamps:true});export default mongoose.model('HeroSlide',schema);
