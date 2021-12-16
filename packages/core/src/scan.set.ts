import { OnDestroy, Resolver, Type } from '@tsdi/ioc';
import { ApplicationContext } from './context';

/**
 * scan set.
 */
export interface ScanSet<T = any> extends OnDestroy {
    /**
     * the scan count.
     */
    get count(): number;
    /**
     * get all.
     */
    getAll(): Resolver<T>[];
    /**
     * has register scan type.
     * @param type
     */
    has(type: Type): boolean;
    /**
     * add scan resolver.
     * @param resolver resolver instance.
     * @param order the order insert to.
     */
    add(resolver: Resolver<T>, order?: number): void;
    /**
     * remove scan resolver.
     * @param resolver resolver instance.
     */
    remove(resolver: Resolver<T>): void;
    /**
     * clear scan resolver.
     */
    clear(): void;
    /**
     * statup scans.
     * @param ctx
     */
    startup(ctx: ApplicationContext): Promise<void>;
}
