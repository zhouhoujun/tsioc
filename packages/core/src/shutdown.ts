import { isFunction, isTypeObject } from '@tsdi/ioc';

/**
 * application shutdown hooks
 */
export interface OnShutdown {
    /**
     * shutdown hooks
     */
    onApplicationShutdown(): void | Promise<void>;
}

export function isShutdown(target: any): target is OnShutdown {
    return isTypeObject(target) && isFunction((target as OnShutdown).onApplicationShutdown);
}

/**
 * application shutdown handd
 */
export interface ApplicationShutdownHandlers {
    add(shutdown: OnShutdown): void;
    remove(shutdown: OnShutdown): void;
    clear(): void;
    /** 
     * shutdown enabled or not
     */
    get enabled(): boolean;
    run(): Promise<void>;
}