import { Abstract, Resolver, Type } from '@tsdi/ioc';
import { ApplicationContext } from './context';
import { ScanSet } from './scan.set';

/**
 * server.
 */
export interface Server {
    /**
     * startup server.
     */
    startup(): void | Promise<void>;
}


@Abstract()
export abstract class ServerSet implements ScanSet<Server> {
    /**
     * the server count.
     */
    abstract get count(): number;
    /**
     * get all resolvers.
     */
    abstract getAll(): Resolver<Server>[];
    /**
     * has the client type or not.
     * @param type class type.
     */
     abstract has(type: Type<any>): boolean;
    /**
     * add server resolver.
     * @param resolver resolver instance.
     * @param order the order insert to.
     */
    abstract add(resolver: Resolver<Server>, order?: number): void;
    /**
     * remove server resolver.
     * @param resolver esolver instance.
     */
    abstract remove(resolver: Resolver<Server>): void;
    /**
     * clear server resolver.
     */
    abstract clear(): void;
    /**
     * startup all server.
     */
    abstract startup(ctx: ApplicationContext): Promise<void>;
    /**
     * destory this.
     */
    abstract onDestroy(): void
}
