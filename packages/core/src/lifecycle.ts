import { Abstract, LifecycleHooks, OnDestroy } from '@tsdi/ioc';


/**
 * OnDispose hooks. use to dispose server client server ...
 */
export interface OnDispose {
    /**
     * dispose hook.
     */
    onDispose(): Promise<void>;
}

/**
 * application shutdown hooks
 */
export interface OnShutdown {
    /**
     * shutdown hooks
     */
    onApplicationShutdown(): void | Promise<void>;
}


export type Hooks = OnDispose & OnShutdown & OnDestroy;

/**
 * module lifecycle hooks
 */
@Abstract()
export abstract class ModuleLifecycleHooks extends LifecycleHooks {
    /**
     * invoked dispose or not
     */
    abstract get disposed(): boolean;
    /**
     * invoked shutdown or not.
     */
    abstract get shutdown(): boolean;
    /**
     * run all destroy hook hooks.
     */
    abstract runDisoise(): Promise<void>;

    /**
     * run all shutdown hook hooks.
     */
    abstract runShutdown(): Promise<void>;
}
