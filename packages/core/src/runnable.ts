import { Abstract, Type, Destroyable, OnDestroy, TypeReflect, Injector, DestroyCallback, InvokeOption } from '@tsdi/ioc';

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
     * runnable target type.
     *
     * @readonly
     * @abstract
     * @type {Type<T>}
     * @memberof RunnableRef
     */
    abstract get type(): Type<T>;
    /**
     * runnable target type reflect.
     *
     * @readonly
     * @abstract
     * @type {TypeReflect<T>}
     * @memberof RunnableRef
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * injector. instance of {@link Injector}.
     *
     * @readonly
     * @abstract
     * @type {Injector}
     * @memberof RunnableRef
     */
    abstract get injector(): Injector;
    /**
     * target instance.
     *
     * @readonly
     * @abstract
     * @type {T}
     * @memberof RunnableRef
     */
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
     * Destroys the runnable instance and all of the data structures associated with it.
     */
    abstract destroy(): void;
    /**
     * A lifecycle hook that provides additional developer-defined cleanup
     * functionality for the runnable.
     * @param callback A handler function that cleans up developer-defined data
     * associated with this runnable. Called when the `destroy()` method is invoked.
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
     * runnbale reflect.
     */
    abstract get reflect(): TypeReflect<T>;
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
    abstract resolve<T>(type: Type<T> | TypeReflect<T>): RunnableFactory<T>;
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
