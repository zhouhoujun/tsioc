import { Abstract, Resolver, Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ApplicationContext } from './context';
import { ScanSet } from './scan.set';


/**
 * client proxy
 */
export interface Client {
    /**
     * connect server
     */
    connect(): Promise<void>;

    /**
     * send message.
     * @param pattern 
     * @param data 
     */
    send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult>;
    /**
     * emit message
     * @param pattern 
     * @param data 
     */
    emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult>;
}


@Abstract()
export abstract class ClientSet implements ScanSet<Client> {
    /**
     * the client count.
     */
    abstract get count(): number;
    
    abstract getAll(): Resolver<Client>[];
    /**
     * has the client type or not.
     * @param type 
     */
    abstract has(type: Type<any>): boolean;
    /**
     * add client resolver.
     * @param resolver 
     */
    abstract add(resolver: Resolver<Client>, order?: number): void;
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
     * destory this.
     */
    abstract onDestroy(): void
    /**
     * connect all client.
     */
    abstract startup(ctx: ApplicationContext): Promise<void>;
}