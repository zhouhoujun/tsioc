import { Execption, isString } from '@tsdi/ioc';

/**
 * transaction error.
 */
export class TransactionError extends Execption {
    constructor(message: string | Error) {
        super(isString(message) ? message : message.stack || message.message)
    }
}