import { Abstract, isFunction, isTypeObject } from '@tsdi/ioc';
import { isDisposable } from './dispose';

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

/**
 * application exit.
 */
@Abstract()
export abstract class ApplicationExit {
    /**
     * register application process signls
     */
    abstract register(): void;
}

/**
 * application arguments.
 */
@Abstract()
export abstract class ApplicationArguments {
    /**
     * process args source
     */
    abstract get argsSource(): string[];
    /**
     * process args map.
     */
    abstract get args(): Record<string, string>;
    /**
     * process args command.
     */
    abstract get cmds(): string[];
    /**
     * process env
     */
    abstract get env(): Record<string, string | undefined>;
    /**
     * process exit signls.
     */
    abstract get signls(): string[];
    /**
     * reset args.
     * @param args 
     */
    abstract reset(args: string[]): void;
}

/**
 * application shutdown
 */
export interface Shutdown<T = any> {
    /**
     * shundown target.
     */
    target: T;
    /**
     * run shutdown.
     */
    run(): Promise<void>;
}

export function createShutdown(target: any, run?: () => Promise<void>) {
    if (!run) {
        run = async () => {
            if (isDisposable(target)) {
                await target.dispose();
            }
            if (isShutdown(target)) {
                await target.onApplicationShutdown();
            }
        }
    }
    return {
        target,
        run
    }
}

/**
 * application shutdown handlers
 */
@Abstract()
export abstract class ApplicationShutdownHandlers {
    /**
     * has shutdown hooks or not.
     * @param shutdown 
     */
    abstract has(shutdown: Shutdown|any): boolean;
    /**
     * add shutdown hooks
     * @param shutdown 
     */
    abstract add(shutdown: Shutdown): void;
    /**
     * remove shutdown hooks
     * @param shutdown shutdown or shutdown target.
     */
    abstract remove(shutdown: Shutdown | any): void;
    /**
     * clear all shutdown hooks.
     */
    abstract clear(): void;
    /** 
     * shutdown enabled or not
     */
    abstract get disposed(): boolean;
    /**
     * run all shutdown hooks.
     */
    abstract run(): Promise<void>;
}