import { OnDestroy, Type } from '@tsdi/ioc';
import { ApplicationContext } from './context';

/**
 * scan set.
 */
export interface ScanSet<T extends TypeRef = TypeRef> extends OnDestroy {
    /**
     * the scan count.
     */
    get count(): number;
    /**
     * get all.
     */
    getAll(): T[];
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
    add(ref: T, order?: number): void;
    /**
     * remove scan {@link TypeRef}.
     * @param ref resolver instance.
     */
    remove(ref: T): void;
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


export interface TypeRef<T = any> {
    get type(): Type<T>;
}
