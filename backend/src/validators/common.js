import {body,param,query} from 'express-validator';
export const idParam=[param('id').isMongoId().withMessage('Valid id is required')];
export const pagination=[query('page').optional().isInt({min:1}),query('limit').optional().isInt({min:1,max:100})];
export const admissionRules=[body('studentName').trim().notEmpty().isLength({max:100}),body('parentName').trim().notEmpty().isLength({max:100}),body('phone').trim().matches(/^[0-9+\-\s()]{7,20}$/),body('email').optional({checkFalsy:true}).isEmail().normalizeEmail(),body('age').trim().notEmpty().isLength({max:30}),body('program').isIn(['Play Group','Nursery','LKG','UKG']),body('message').optional({checkFalsy:true}).trim().isLength({max:1000})];
export const contactRules=[body('name').trim().notEmpty().isLength({max:100}),body('phone').trim().matches(/^[0-9+\-\s()]{7,20}$/),body('email').optional({checkFalsy:true}).isEmail().normalizeEmail(),body('subject').optional({checkFalsy:true}).trim().isLength({max:150}),body('message').trim().notEmpty().isLength({max:1500})];
export const newsletterRules=[body('email').isEmail().normalizeEmail()];
