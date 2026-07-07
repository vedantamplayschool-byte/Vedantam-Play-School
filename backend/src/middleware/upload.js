import multer from 'multer';import {env} from '../config/env.js';
const storage=multer.memoryStorage();
export const upload=multer({storage,limits:{fileSize:env.maxFileSizeMb*1024*1024},fileFilter:(req,file,cb)=>{if(!file.mimetype.startsWith('image/'))return cb(new Error('Only image files are allowed'));cb(null,true)}});
