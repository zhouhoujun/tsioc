import { Runnable } from '../runnable';
import { IAnnotationBuilder } from './IAnnotationBuilder';
import { Token, ObjectMap } from '@ts-ioc/core';
import { BeforeAnnotationInit, AfterAnnotationInit } from './IAnnotation';
import { AnnotationConfigure } from './AnnotationConfigure';

/**
 * build options.
 *
 * @export
 * @interface BuildOptions
 * @template T
 */
export interface BuildOptions<T> extends ObjectMap<any> {

    /**
     * annotation builder.
     *
     * @type {IAnnotationBuilder<T>}
     * @memberof BuildOptions
     */
    builder?: IAnnotationBuilder<T>;
    /**
     * on build completed.
     *
     * @param {Token<any>} token
     * @param {AnnotationConfigure<T>} config
     * @param {BootHooks<T>} [instance]
     * @param {IAnnotationBuilder<T>} [builder]
     * @memberof BuildOptions
     */
    onCompleted?(token: Token<T>, config: AnnotationConfigure<T>, instance?: BootHooks<T>, builder?: IAnnotationBuilder<T>);
    /**
     * vaild toke completed.
     *
     * @param {Token<any>} token
     * @returns {boolean}
     * @memberof BuildOptions
     */
    vaild?(token: Token<any>): boolean;
    /**
     * build base on target.
     *
     * @type {*}
     * @memberof BuildOptions
     */
    target?: any;

    /**
     * runner default data.
     *
     * @type {*}
     * @memberof BuildOptions
     */
    data?: any;
}

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
