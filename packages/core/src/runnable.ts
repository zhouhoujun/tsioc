import { Abstract, Type, Destroyable, OnDestroy, TypeDef, Injector, InvokeOption, ReflectiveRef, DestroyCallback } from '@tsdi/ioc';

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
    /**
     * runnable reflective ref.
     */
    abstract get ref(): ReflectiveRef<T>;
    /**
      * runnable def.
      */
    abstract get def(): TypeDef<T>;
    /**
     * runnable type.
     */
    abstract get type(): Type<T>;
    /**
     * runnable instance.
     *
     * @readonly
     * @abstract
     * @type {T}
     */
    abstract get instance(): T;
    /**
     * run.
     */
    abstract run(): any;
    /**
     * runnable ref has destroyed or not.
     */
    abstract get destroyed(): boolean;
    /**
     * destroy this.
     */
    abstract destroy(): void;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    abstract onDestroy(callback?: DestroyCallback): void;
}


/**
 * bootstrap option for {@link Runnable}.
 */
export interface BootstrapOption extends InvokeOption {
    /**
     * set the method as default invoked as runnable.
     * when has no `@Runner` in this class, will run this method as default. default value `run`.
     */
    defaultInvoke?: string;
}

/**
 * runnable factory.
 */
@Abstract()
export abstract class RunnableFactory<T> {
    /**
     * runnbale def.
     */
    abstract get def(): TypeDef<T>;
    /**
     * create new instance of {@link RunnableRef} via this type.
     * @param injector injector.
     * @param option bootstrap option.
     * @returns instance of {@link RunnableRef}.
     */
    abstract create(injector: Injector, option?: BootstrapOption): RunnableRef<T>;
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
    abstract resolve<T>(type: Type<T> | TypeDef<T>): RunnableFactory<T>;
}

/**
 * runnable scan set.
 */
@Abstract()
export abstract class RunnableSet<T = any> {
    /**
     * the service count.
     */
    abstract get count(): number;
    /**
     * get all.
     */
    abstract getAll(): RunnableRef<T>[];
    /**
     * has the client type or not.
     * @param type has resolver of the type or not.
     */
    abstract has(type: Type<T>): boolean;
    /**
     * add service resolver.
     * @param resolver resolver runnable.
     * @param order order.
     */
    abstract add(resolver: RunnableRef<T>, order?: number): void;
    /**
     * remove service resolver.
     * @param resolver remove the resolver.
     */
    abstract remove(resolver: RunnableRef<T>): void;
    /**
     * clear service resolver.
     */
    abstract clear(): void;
    /**
     * destroy this.
     */
    abstract onDestroy(): void
    /**
     * startup scans runables.
     */
    abstract run(): Promise<void>;
}
