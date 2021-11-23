import { Abstract, Destroy, Resolver } from '@tsdi/ioc';
import { Disposable } from '../dispose';


/**
 * client proxy
 */
export interface Client extends Disposable {
    /**
     * connect server
     */
    connect(): void | Promise<void>;

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

@Abstract()
export abstract class ClientSet implements Destroy {
    /**
     * the client count.
     */
    abstract get count(): number;
    /**
     * add client resolver.
     * @param resolver 
     */
    abstract add(resolver: Resolver<Client>): void;
    /**
     * remove client resolver.
     * @param resolver 
     */
    abstract remove(resolver: Resolver<Client>): void;
    /**
     * clear client resolver.
     */
    abstract clear(): void;
    /**
     * connect all client.
     */
    abstract connent(): Promise<void>;
    /**
     * destory this.
     */
    abstract destroy(): void
}