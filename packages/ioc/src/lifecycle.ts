import { Platform } from './injector';
import { Abstract } from './metadata/fac';


/**
 * lifecycle hooks.
 */
@Abstract()
export abstract class LifecycleHooks {
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
     * @param hook 
     */
    abstract register(target: any): void;
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
