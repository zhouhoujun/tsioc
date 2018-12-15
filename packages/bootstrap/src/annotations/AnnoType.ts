import { Runnable } from '../runnable';
import { IAnnotationBuilder } from './IAnnotationBuilder';
import { Token } from '@ts-ioc/core';
import { BeforeAnnotationInit, AfterAnnotationInit } from './IAnnotation';
import { AnnotationConfigure } from './AnnotationConfigure';


export type AnnoBuildCompleted<T> = (config: AnnotationConfigure<T>, instance?: BootHooks<T>, builder?: IAnnotationBuilder<T>) => void;

export type AnnoTokenVaild<T> = (token: Token<T>) => boolean;

/**
 * boot instance.
 */
export type AnnoInstance<T> = T & BeforeAnnotationInit<T> & AfterAnnotationInit<T>;


/**
 *  boot hooks.
 */
export type BootHooks<T> = AnnoInstance<T> & BeforStart<T> & AfterStart<any>;


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
