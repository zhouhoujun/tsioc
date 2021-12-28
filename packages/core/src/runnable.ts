import { Abstract, Type, Destroyable, OnDestroy, TypeReflect, Injector, DestroyCallback } from '@tsdi/ioc';
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
export abstract class RunnableRef<T = any> implements Runnable, Destroyable, OnDestroy {

    abstract get type(): Type<T>;

    abstract get reflect(): TypeReflect<T>;

    abstract get injector(): Injector;

    abstract get instance(): T;
    /**
     * run.
     */
    abstract run(): any;
    /**
    * is destroyed or not.
    */
    abstract get destroyed(): boolean;
    /**
     * Destroys the component instance and all of the data structures associated with it.
     */
    abstract destroy(): void;
    /**
     * A lifecycle hook that provides additional developer-defined cleanup
     * functionality for the component.
     * @param callback A handler function that cleans up developer-defined data
     * associated with this component. Called when the `destroy()` method is invoked.
     */
    abstract onDestroy(callback?: DestroyCallback): void;
}

/**
 * runnable scan set.
 */
@Abstract()
export abstract class RunnableSet implements ScanSet<RunnableRef> {
    /**
     * the service count.
     */
    abstract get count(): number;
    /**
     * get all.
     */
    abstract getAll(): RunnableRef[];
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
    abstract add(resolver: RunnableRef, order?: number): void;
    /**
     * remove service resolver.
     * @param resolver remove the resolver.
     */
    abstract remove(resolver: RunnableRef): void;
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
     * runnbale reflect.
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * create new instance of {@link RunnableRef} via this type.
     * @param injector injector.
     * @param option bootstrap option.
     * @param context application context.
     * @returns instance of {@link RunnableRef}.
     */
    abstract create(injector: Injector, option?: BootstrapOption, context?: ApplicationContext): RunnableRef<T>;
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
    abstract resolve<T>(type: Type<T> | TypeReflect<T>): RunnableFactory<T>;
}
