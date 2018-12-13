import { Runnable } from '../runnable';
import { AnnotationConfigure } from './IAnnotationBuilder';


/**
 *  boot hooks.
 */
export type BootHooks<T> = T & BeforStart<T> & AfterStart<any>;


/**
 * on module init.
 *
 * @export
 * @interface OnModuleInit
 */
export interface BeforStart<T> {
    /**
     * before boot start.
     *
     * @param {AnnotationConfigure<T>} [config]
     * @memberof OnModuleInit
     */
    bootStarting(config?: AnnotationConfigure<T>): void;
}

/**
 * module bootstrp start hook, raise hook on module bootstrap start.
 *
 * @export
 * @interface OnModuleStart
 * @template T
 */
export interface AfterStart<T> {
    /**
     * aftter boot started.
     *
     * @param {T} [runnable]
     * @memberof OnStart
     */
    bootStarted(runnable?: Runnable<T>): void | Promise<void>;
}
