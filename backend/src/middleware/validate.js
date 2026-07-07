import {validationResult} from 'express-validator';import {fail} from '../utils/apiResponse.js';
export const validate=(req,res,next)=>{const result=validationResult(req);if(result.isEmpty())return next();return fail(res,{status:422,message:'Validation failed',errors:result.array().map(e=>({field:e.path,message:e.msg}))})};
