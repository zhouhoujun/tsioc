import { Express, TypeMetadata, createClassMethodDecorator, ClassMethodDecorator, isString, isFunction, Type } from '@tsdi/ioc';
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
 * @template T
 */
export interface ILoggerDecorator<T extends LoggerMetadata> {
    /**
     * define logger annotation pointcut to this class or method.
     * @Logger
     *
     * @param {string} message set special message to logging.
     * @param {Level} [level] set log level to this message.
     */
    (message: string, level?: Level): ClassMethodDecorator;
    /**
     * define logger annotation pointcut to this class or method.
     * @Logger
     *
     * @param {string} logname set the special name to get logger from logger manager.
     * @param {string} message set special message to logging.
     * @param {Level} [level] set log level to this message.
     */
    (logname: string, message: string, level?: Level): ClassMethodDecorator;
    /**
     * define logger annotation pointcut to this class or method.
     * @Logger
     *
     * @param {string} logname set the special name to get logger from logger manager.
     * @param {Express<any, boolean>} express only match express condition can do logging.
     * @param {string} message set special message to logging.
     * @param {Level} [level] set log level to this message.
     */
    (logname: string, express: Express<any, boolean>, message: string, level?: Level): ClassMethodDecorator;

    /**
     * define logger annotation pointcut to this class or method.
     *
     * @Logger
     *
     * @param {T} [metadata] logger metadata.
     */
    (metadata?: T): ClassMethodDecorator;

    /**
     * define logger annotation pointcut to this class or method.
     *
     * @Logger
     */
    (target: Type): void;
    /**
     * define logger annotation pointcut to this class or method.
     */
    (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): void;

}

/**
 * Logger decorator, for method or class.
 *
 * @Logger
 */
export const Logger: ILoggerDecorator<LoggerMetadata> = createClassMethodDecorator<LoggerMetadata>('Logger', {
    actions: [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                if (ctx.args.length === 1) {
                    ctx.metadata.message = arg;
                } else {
                    ctx.metadata.logname = arg;
                    if (ctx.args.length === 2) {
                        ctx.metadata.message = arg;
                    }
                    ctx.next(next);
                }
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isFunction(arg)) {
                ctx.metadata.express = arg;
                ctx.next(next);
            } else if (isString(arg)) {
                if (Level[arg]) {
                    ctx.metadata.level = Level[arg];
                } else {
                    ctx.metadata.message = arg;
                    ctx.next(next);
                }
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                if (Level[arg]) {
                    ctx.metadata.level = Level[arg];
                } else {
                    ctx.metadata.message = arg;
                    ctx.next(next);
                }
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.level = Level[arg];
            }
        },
    ]
}) as ILoggerDecorator<LoggerMetadata>;
