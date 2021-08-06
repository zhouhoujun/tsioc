import { TypeMetadata, ClassMethodDecorator, isFunction, createDecorator, EMPTY_OBJ } from '@tsdi/ioc';
import { isLevel, Level } from '../Level';


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
     */
    logname?: string;

    /**
     * log level
     */
    level?: Level;

    /**
     * only match express condition can do loging.
     */
    express?(item: any): boolean;
    /**
     * set special message to logging
     *
     * @type {string}
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
     * @param {express: (item: any) => boolean} express only match express condition can do logging.
     * @param {string} message set special message to logging.
     * @param {Level} [level] set log level to this message.
     */
    (logname: string, express: (item: any) => boolean, message: string, level?: Level): ClassMethodDecorator;

    /**
     * define logger annotation pointcut to this class or method.
     *
     * @Logger
     *
     * @param {T} [metadata] logger metadata.
     */
    (metadata?: T): ClassMethodDecorator;

}

/**
 * Logger decorator, for method or class.
 *
 * @Logger
 */
export const Logger: ILoggerDecorator<LoggerMetadata> = createDecorator<LoggerMetadata>('Logger', {
    props: (...args: any[]) => {
        if (args.length === 1) {
            return { message: args[0] };
        } else if (args.length === 2) {
            const [arg1, arg2] = args;
            if (isLevel(arg2)) {
                return { message: arg1, level: arg2 }
            } else {
                return { logname: arg1, message: arg2 }
            }
        } else if (args.length > 2) {
            const [arg1, arg2, arg3, arg4] = args;
            if (isFunction(arg2)) {
                return { logname: arg1, express: arg2, message: arg3, level: arg4 };
            } else {
                return { logname: arg1, message: arg2, level: arg3 }
            }

        }
        return EMPTY_OBJ;
    }
}) as ILoggerDecorator<LoggerMetadata>;
