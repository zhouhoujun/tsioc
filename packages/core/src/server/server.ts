import { Abstract, Destroy, Resolver } from '@tsdi/ioc';

/**
 * server.
 */
export interface Server {
    /**
     * connect server
     */
    connect(): void | Promise<void>;

}


@Abstract()
export abstract class ServerSet implements Destroy {
    /**
     * the server count.
     */
    abstract get count(): number;
    /**
     * add server resolver.
     * @param resolver 
     */
    abstract add(resolver: Resolver<Server>): void;
    /**
     * remove server resolver.
     * @param resolver 
     */
    abstract remove(resolver: Resolver<Server>): void;
    /**
     * clear server resolver.
     */
    abstract clear(): void;
    /**
     * connect all server.
     */
    abstract connent(): Promise<void>;
    /**
     * destory this.
     */
    abstract destroy(): void
}