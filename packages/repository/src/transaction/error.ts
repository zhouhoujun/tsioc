import { Execption, isString } from '@tsdi/ioc';

/**
 * transaction execption.
 */
export class TransactionExecption extends Execption {
    constructor(message: string | Error) {
        super(isString(message) ? message : message.stack || message.message)
    }
}