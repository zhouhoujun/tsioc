import { Abstract, Type, OperationFactory } from '@tsdi/ioc';
import { ApplicationContext } from './context';
import { ScanSet } from './scan.set';

/**
 * Startup server.
 */
export interface Startup {
    /**
     * startup server.
     */
    startup(): void | Promise<void>;
}


@Abstract()
export abstract class StartupSet implements ScanSet<OperationFactory<Startup>> {
    /**
     * the Startup server count.
     */
    abstract get count(): number;
    /**
     * get all resolvers.
     */
    abstract getAll(): OperationFactory<Startup>[];
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
    abstract add(resolver: OperationFactory<Startup>, order?: number): void;
    /**
     * remove server resolver.
     * @param resolver esolver instance.
     */
    abstract remove(resolver: OperationFactory<Startup>): void;
    /**
     * clear server resolver.
     */
    abstract clear(): void;
    /**
     * startup all server.
     */
    abstract startup(ctx: ApplicationContext): Promise<void>;
    /**
     * destroy this.
     */
    abstract onDestroy(): void
}
