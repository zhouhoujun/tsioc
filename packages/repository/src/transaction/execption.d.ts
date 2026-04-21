import { Exception } from '@tsdi/ioc';
/**
 * transaction execption.
 */
export declare class TransactionException extends Exception {
    constructor(message: string | Error);
}
