import { Injector, Platform } from './injector';
import { Abstract } from './metadata/fac';
import { Token } from './tokens';


/**
 * lifecycle hooks.
 */
@Abstract()
export abstract class LifecycleHooks {
    // /**
    //  * init lifecycle
    //  * @param injector 
    //  */
    // abstract init(injector: Injector): void;
    // /**
    //  * invoked dispose or not
    //  */
    // abstract get disposed(): boolean;
    // /**
    //  * invoked shutdown or not.
    //  */
    // abstract get shutdown(): boolean;
    /**
     * can destroy or not.
     */
    abstract get destroyable(): boolean;
    /**
     * try dispose to enable destroy.
     */
    abstract dispose(): Promise<void>;
    /**
     * register hooks
     * @param target 
     * @param token toke of target. 
     */
    abstract register(target: any, token: Token): void;
    /**
     * clear all hooks.
     */
    abstract clear(): void;
    /**
     * run all destroy hook hooks.
     */
    abstract runDestroy(): void;

}

@Abstract()
export abstract class LifecycleHooksResolver {
    abstract resolve(plaform?: Platform): LifecycleHooks;
} 
