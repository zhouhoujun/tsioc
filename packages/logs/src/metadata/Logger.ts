import { TypeMetadata, ClassMethodDecorator, isFunction, createDecorator, EMPTY_OBJ, OperationArgumentResolver, Type, isString, lang, PropParamDecorator, Handler, DecorContext } from '@tsdi/ioc';
import { isLevel, Level } from '../Level';
import { ConfigureLoggerManager } from '../manager';


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

    resolver?: OperationArgumentResolver;

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
 * inject logger for property or parameter with the name in {@link ILoggerManager}.
 *
 * @Logger
 *
 * @export
 * @interface ILoggerDecorator
 * @template T
 */
export interface Logger<T extends LoggerMetadata> {
    /**
     * inject logger for property or parameter with the name in {@link ILoggerManager}.
     * @Logger
     *
     * @param {string} name the logger name.  Default current class name.
     */
    (name?: string | Type): PropParamDecorator;

    /**
     * define logger annotation pointcut to this class or method.
     * @Logger
     *
     * @param {string} message set special message to logging.
     * @param {Level} [level] set log level to this message.
     */
    (message: string, level: Level): ClassMethodDecorator;
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

}

const loggerResolver = {
    canResolve: (pr: LoggerMetadata, ctx) => pr.logname && ctx.injector.has(ConfigureLoggerManager),
    resolve: (pr: LoggerMetadata, ctx) => ctx.injector.get(ConfigureLoggerManager).getLogger(pr.logname)
} as OperationArgumentResolver;


/**
 * Logger decorator, for method or class.
 *
 * @Logger
 */
export const Logger: Logger<LoggerMetadata> = createDecorator<LoggerMetadata>('Logger', {
    actionType: ['paramInject', 'propInject'],
    init: (ctx) => {
        if (ctx.decorType === 'parameter' || ctx.decorType === 'property') {
            const metadata = ctx.metadata as LoggerMetadata;
            if (!metadata.logname) {
                metadata.logname = lang.getClassName(ctx.reflect.type);
                metadata.resolver = loggerResolver;
            }
        }
    },
    props: (...args: any[]) => {
        if (args.length === 1) {
            const logname = isString(args[0]) ? args[0] : lang.getClassName(args[0]);
            return {
                logname,
                resolver: loggerResolver
            };
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
});
