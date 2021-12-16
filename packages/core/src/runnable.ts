import { Abstract, Resolver, Type } from '@tsdi/ioc';
import { ApplicationContext, BootstrapOption } from './context';
import { ScanSet } from './scan.set';

/**
 * runnable
 */
export interface Runnable {
    /**
     * run.
     */
    run(): any;
}

/**
 * runner
 */
@Abstract()
export abstract class Runner implements Runnable {
    /**
     * run.
     */
    abstract run(): any;
}

/**
 * runnable scan set.
 */
@Abstract()
export abstract class RunnableSet implements ScanSet<Runnable> {
    /**
     * the service count.
     */
    abstract get count(): number;
    /**
     * get all.
     */
    abstract getAll(): Resolver<Runnable>[];
    /**
     * has the client type or not.
     * @param type has resolver of the type or not.
     */
    abstract has(type: Type<any>): boolean;
    /**
     * add service resolver.
     * @param resolver resolver runnable.
     * @param order order.
     */
    abstract add(resolver: Resolver<Runnable>, order?: number): void;
    /**
     * remove service resolver.
     * @param resolver remove the resolver.
     */
    abstract remove(resolver: Resolver<Runnable>): void;
    /**
     * clear service resolver.
     */
    abstract clear(): void;
    /**
     * destory this.
     */
    abstract onDestroy(): void
    /**
     * startup all service.
     */
    abstract startup(ctx: ApplicationContext): Promise<void>;
}

/**
 * runnable factory.
 */
@Abstract()
export abstract class RunnableFactory<T> {
    /**
     * runnbale type.
     */
    abstract get type(): Type<T>;
    /**
     * create new instance of {@link Runnable} via this type.
     * @param option bootstrap option.
     * @param context application context.
     */
    abstract create(option: BootstrapOption, context?: ApplicationContext): Runnable;
}

/**
 * runnable factory resolver.
 */
@Abstract()
export abstract class RunnableFactoryResolver {
    /**
     * resolve runnable factory of type.
     * @param type class type.
     */
    abstract resolve<T>(type: Type<T>): RunnableFactory<T>;
}
