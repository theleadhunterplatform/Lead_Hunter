import { Request, Response, NextFunction } from 'express';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ErrorResponse from '../utils/error-response.utils';

const ajv = new Ajv({ allErrors: true, removeAdditional: true });
addFormats(ajv);

export const validate = (schema: object) => {
    const validateFn = ajv.compile(schema);
    
    return (req: Request, _res: Response, next: NextFunction) => {
        const valid = validateFn(req.body);
        
        if (!valid) {
            const errors = validateFn.errors?.map(err => ({
                field: err.instancePath.replace('/', ''),
                message: err.message
            }));
            
            return next(new ErrorResponse('Validation Failed', 400, errors));
        }
        
        return next();
    };
};
