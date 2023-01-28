import { Abstract, LifecycleHooks, OnDestroy } from '@tsdi/ioc';
import { ApplicationEventMulticaster } from './events';


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
 * application start hooks
 */
export interface OnApplicationStart {
    /**
     * start hooks
     */
    onApplicationStart(): void | Promise<void>;
}

/**
 * application shutdown hooks
 */
export interface OnApplicationShutdown {
    /**
     * shutdown hooks
     */
    onApplicationShutdown(): void | Promise<void>;
}


export type Hooks = OnApplicationStart & OnApplicationShutdown & OnDispose & OnDestroy;

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

}
