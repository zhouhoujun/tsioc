import { OnDestroy } from '@tsdi/ioc';


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
    onApplicationStart(): void;
}

/**
 * application shutdown hooks
 */
export interface OnApplicationShutdown {
    /**
     * shutdown hooks
     */
    onApplicationShutdown(): void;
}

/**
 * Application Hooks
 */
export type Hooks = OnApplicationStart & OnApplicationShutdown & OnDispose & OnDestroy;
