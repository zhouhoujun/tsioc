import { OnDestroy, Type, OperationRef } from '@tsdi/ioc';
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
    getAll(): OperationRef<T>[];
    /**
     * has register scan type.
     * @param type
     */
    has(type: Type): boolean;
    /**
     * add scan {@link TypeRef}.
     * @param ref resolver instance.
     * @param order the order insert to.
     */
    add(ref: OperationRef<T>, order?: number): void;
    /**
     * remove scan {@link TypeRef}.
     * @param ref resolver instance.
     */
    remove(ref: OperationRef<T>): void;
    /**
     * clear scan refs.
     */
    clear(): void;
    /**
     * statup scans.
     * @param ctx
     */
    startup(ctx: ApplicationContext): Promise<void>;
}
