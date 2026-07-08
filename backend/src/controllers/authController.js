import Admin from '../models/Admin.js';import {asyncHandler} from '../utils/asyncHandler.js';import {ok} from '../utils/apiResponse.js';import {signToken} from '../middleware/auth.js';import {env} from '../config/env.js';
const cookieOptions={httpOnly:true,sameSite:'strict',secure:env.nodeEnv==='production',maxAge:env.jwtCookieDays*24*60*60*1000};
export const registerFirstAdmin=asyncHandler(async(req,res)=>{const count=await Admin.countDocuments();if(count>0){const e=new Error('Admin registration is disabled');e.status=403;throw e}const admin=await Admin.create(req.body);ok(res,{status:201,message:'Initial admin created',data:{id:admin._id,name:admin.name,email:admin.email,role:admin.role}})});
export const login=asyncHandler(async(req,res)=>{const {email,password}=req.body;const admin=await Admin.findOne({email}).select('+password');if(!admin||!(await admin.comparePassword(password))){const e=new Error('Invalid email or password');e.status=401;throw e}admin.lastLoginAt=new Date();await admin.save({validateBeforeSave:false});const token=signToken(admin._id);res.cookie('token',token,cookieOptions);ok(res,{message:'Logged in successfully',data:{token,admin:{id:admin._id,name:admin.name,email:admin.email,role:admin.role}}})});
export const logout=(req,res)=>{res.clearCookie('token',cookieOptions);ok(res,{message:'Logged out successfully'})};
export const me=(req,res)=>ok(res,{data:{admin:req.admin}});

export const updateProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin.id);
  admin.name = req.body.name ?? admin.name;
  admin.email = req.body.email ?? admin.email;
  await admin.save();
  ok(res, { message: 'Profile updated successfully', data: { admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } } });
});
export const changePassword = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin.id).select('+password');
  if (!(await admin.comparePassword(req.body.currentPassword))) { const e = new Error('Current password is incorrect'); e.status = 400; throw e; }
  admin.password = req.body.newPassword;
  await admin.save();
  ok(res, { message: 'Password changed successfully' });
});
