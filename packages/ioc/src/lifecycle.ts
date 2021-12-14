import { Abstract } from './metadata/fac';



@Abstract()
export abstract class LifecycleHooks {
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
    abstract resolve(): LifecycleHooks;
} 
