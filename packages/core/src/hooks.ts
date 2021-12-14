import { Abstract, DestroyLifecycleHooks, OnDestroy } from '@tsdi/ioc';


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


@Abstract()
export abstract class ModuleLifecycleHooks extends DestroyLifecycleHooks {
    /** 
     * invoked dispose or not
     */
    abstract get disposed(): boolean;
    /**
     * invoked shutdown or not.
     */
    abstract get shutdown(): boolean;
    /**
     * can destroy or not.
     */
    abstract get destroyable(): boolean;
    /**
     * run all destroy hook hooks.
     */
    abstract runDisoise(): Promise<void>;

    /**
     * run all shutdown hook hooks.
     */
    abstract runShutdown(): Promise<void>;
}
