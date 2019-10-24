import { Express, TypeMetadata, IClassMethodDecorator, createClassMethodDecorator, ClassMethodDecorator, isString, isFunction } from '@tsdi/ioc';
import { Level } from '../Level';


/**
 * logger metadata.
 *
 * @export
 * @interface LoggerMetadata
 * @extends {TypeMetadata}
 */
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
export const Logger: ILoggerDecorator<LoggerMetadata> = createClassMethodDecorator<LoggerMetadata>('Logger',
    [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.logname = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isFunction(arg)) {
                ctx.metadata.express = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.message = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.level = Level[arg];
                ctx.next(next);
            }
        },
    ]) as ILoggerDecorator<LoggerMetadata>;
