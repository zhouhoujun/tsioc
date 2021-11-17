import { Destroy } from '@tsdi/ioc';

/**
 * client proxy
 */
export interface Client extends Destroy {
    /**
     * connect server
     */
    connect(): void | Promise<void>;

    /**
     * close client.
     */
    close(): void | Promise<void>;

    /**
     * send message.
     * @param pattern 
     * @param data 
     */
    send<TResult = any, TInput = any>(pattern: any, data: TInput): TResult;
    /**
     * emit message
     * @param pattern 
     * @param data 
     */
    emit<TResult = any, TInput = any>(pattern: any, data: TInput): TResult;
}