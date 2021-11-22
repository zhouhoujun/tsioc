import { Abstract, isFunction, isTypeObject } from '@tsdi/ioc';

/**
 * application shutdown hooks
 */
export interface OnShutdown {
    /**
     * shutdown hooks
     */
    onApplicationShutdown(): void | Promise<void>;
}

/**
 * check target is {@link OnShutdown} shutdown hooks or not. 
 * @param target 
 * @returns is {@link OnShutdown} or not.
 */
export function isShutdown(target: any): target is OnShutdown {
    return isTypeObject(target) && isFunction((target as OnShutdown).onApplicationShutdown);
}


@Abstract()
export abstract class ApplicationArguments {
    abstract get argsSource(): string[];
    abstract get args(): Record<string, string>;
    abstract get cmds(): string[];
    abstract get env(): Record<string, string|undefined>;
    abstract get signls(): string[];
    abstract reset(args: string[]): void;
}

/**
 * application shutdown handlers
 */
@Abstract()
export abstract class ApplicationShutdownHandlers {
    /**
     * add shutdown hooks
     * @param shutdown 
     */
    abstract add(shutdown: OnShutdown): void;
    /**
     * remove shutdown hooks
     * @param shutdown 
     */
    abstract remove(shutdown: OnShutdown): void;
    /**
     * clear all shutdown hooks.
     */
    abstract clear(): void;
    /** 
     * shutdown enabled or not
     */
    abstract get enabled(): boolean;
    /**
     * run all shutdown hooks.
     */
    abstract run(): Promise<void>;
}