import { Exception, isString } from '@tsdi/ioc';

/**
 * transaction execption.
 */
export class TransactionException extends Exception {
    constructor(message: string | Error) {
        super(isString(message) ? message : message.stack || message.message)
    }
}