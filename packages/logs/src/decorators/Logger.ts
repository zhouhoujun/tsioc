import { Level } from '../Level';
import { Express, TypeMetadata, IClassMethodDecorator, createClassMethodDecorator, ClassMethodDecorator, isClassMetadata, isString, isFunction } from '@ts-ioc/core';


export interface LoggerMetadata extends TypeMetadata {
    /**
     * set the special name to get logger from logger manager.
     *
     * @type {string}
     * @memberof LoggerMetadata
     */
    logname?: string;

    /**
     * log level
     */
    level?: Level;

    /**
     * only match express condition can do loging.
     *
     * @type {Express<any, boolean>}
     * @memberof LoggerMetadata
     */
    express?: Express<any, boolean>;
    /**
     * set special message to logging
     *
     * @type {string}
     * @memberof LoggerMetadata
     */
    message?: string;
}

/**
 * Logger decorator, for method or class.
 *
 * @Logger
 *
 * @export
 * @interface ILoggerDecorator
 * @extends {IClassMethodDecorator<T>}
 * @template T
 */
export interface ILoggerDecorator<T extends LoggerMetadata> extends IClassMethodDecorator<T> {
    /**
     * define logger annotation pointcut to this class or method.
     * @Logger
     *
     * @param {string} [logname] set the special name to get logger from logger manager.
     * @param {Express<any, boolean>} [express] only match express condition can do logging.
     * @param {string} [message] set special message to logging.
     * @param {Level} [level] set log level to this message.
     */
    (logname?: string, express?: Express<any, boolean>, message?: string, level?: Level): ClassMethodDecorator;
}

/**
 * Logger decorator, for method or class.
 *
 * @Logger
 */
export const Logger: ILoggerDecorator<LoggerMetadata> = createClassMethodDecorator<TypeMetadata>('Logger',
    adapter => {
        adapter.next<LoggerMetadata>({
            isMetadata: (arg) => isClassMetadata(arg, ['logname']),
            match: (arg) => isString(arg),
            setMetadata: (metadata, arg) => {
                metadata.logname = arg;
            }
        });
        adapter.next<LoggerMetadata>({
            match: (arg) => isFunction(arg),
            setMetadata: (metadata, arg) => {
                metadata.express = arg;
            }
        });
        adapter.next<LoggerMetadata>({
            match: (arg) => isString(arg),
            setMetadata: (metadata, arg) => {
                metadata.message = arg;
            }
        });

        adapter.next<LoggerMetadata>({
            match: (arg) => isString(arg),
            setMetadata: (metadata, arg: string) => {
                metadata.level = Level[arg];
            }
        });
    }) as ILoggerDecorator<LoggerMetadata>;
