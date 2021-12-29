import { Abstract, OperationFactory, Type } from '@tsdi/ioc';
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
    connect(): Promise<any>;

    /**
     * send message.
     * @param pattern message pattern.
     * @param data send data.
     */
    send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult>;
    /**
     * emit message
     * @param pattern event pattern.
     * @param data event data.
     */
    emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult>;
}


@Abstract()
export abstract class ClientSet implements ScanSet<OperationFactory<Client>> {
    /**
     * the client count.
     */
    abstract get count(): number;
    /**
     * get all client.
     */
    abstract getAll(): OperationFactory<Client>[];
    /**
     * has the client type or not.
     * @param type class type/
     */
    abstract has(type: Type<any>): boolean;
    /**
     * add client resolver.
     * @param resolver resolver instance.
     */
    abstract add(resolver: OperationFactory<Client>, order?: number): void;
    /**
     * remove client resolver.
     * @param resolver resolver instance.
     */
    abstract remove(resolver: OperationFactory<Client>): void;
    /**
     * clear client resolver.
     */
    abstract clear(): void;
    /**
     * destroy this.
     */
    abstract onDestroy(): void
    /**
     * connect all client.
     */
    abstract startup(ctx: ApplicationContext): Promise<void>;
}
