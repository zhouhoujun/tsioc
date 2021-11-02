import { Destroyable } from './destroy';
import { Injector, Registered } from './injector';
import { Abstract } from './metadata/fac';
import { Type } from './types';


@Abstract()
export abstract class ModuleRef<T = any> extends Injector implements Destroyable {
    /**
     * module type
     */
    abstract get moduleType(): Type<T>;
    /**
     * The injector that contains all of the providers of the `Module`.
     */
    abstract get injector(): Injector;
    /**
     * the modle instance.
     */
    abstract get instance(): T;
    /**
     * destory.
     */
    abstract destroy(): void;
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    abstract onDestroy(callback: () => void): void
}

/**
 * module registered state.
 */
export interface ModuleRegistered extends Registered {
    moduleRef?: ModuleRef;
}

