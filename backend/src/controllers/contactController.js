import Contact from '../models/Contact.js';import {asyncHandler} from '../utils/asyncHandler.js';import {ok} from '../utils/apiResponse.js';import {list,getOne,update,remove} from './factoryController.js';
export const createContact=asyncHandler(async(req,res)=>{const doc=await Contact.create(req.body);ok(res,{status:201,message:'Message received successfully',data:doc})});
export const listContacts=list(Contact,['name','phone','email','message']);export const getContact=getOne(Contact);export const updateContact=update(Contact);export const deleteContact=remove(Contact);
