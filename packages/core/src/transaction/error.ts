import { isString } from '@tsdi/ioc';

/**
 * transaction error.
 */
export class TransactionError extends Error {
    constructor(message: string| Error){
        super(isString(message)? message : message.stack || message.message);
        Object.setPrototypeOf(this, TransactionError.prototype);
        Error.captureStackTrace(this);
    }
}