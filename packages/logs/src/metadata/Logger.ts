import {
    TypeMetadata, ClassMethodDecorator, isFunction, createDecorator, EMPTY_OBJ,
    OperationArgumentResolver, Type, isString, lang, PropParamDecorator, ArgumentError, Decors, ActionTypes
} from '@tsdi/ioc';
import { LoggerConfig } from '..';
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

    paramName?: string;
    propertyKey?: string;
    /**
     * logger config.
     */
    config?: LoggerConfig;
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
     * @param options the logger options.
     */
    (name?: string | Type): PropParamDecorator;
    /**
     * inject logger for property or parameter with the name in {@link ILoggerManager}.
     * @Logger
     *
     * @param options the logger options.
     */
    (options: {
        /**
         * {string} name the logger name.  Default current class name.
         */
        logname?: string | Type,
        /**
         * [level] set the logger level.
         */
        level?: Level;
        /**
         * logger config.
         */
        config?: Record<string, any>;
    }): PropParamDecorator;

    /**
     * define logger annotation pointcut to this class or method.
     * @Logger
     *
     * @param {string} message set special message to logging.
     * @param {string} logname use the logger with name.  Default current class name.
     * @param {Level} [level] set log level to this message.
     */
    (message: string, logname: string, level?: Level): MethodDecorator;
    /**
     * define logger annotation pointcut to this class or method.
     * @Logger
     *
     * @param {string} message set special message to logging.
     * @param {Level} [level] set log level to this message.
     */
    (message: string, options: {
        /**
         * use the logger with name.  Default current class name.
         */
        logname?: string | Type,
        /**
         * set log level to this message.
         */
        level?: Level;
        /**
         * express only match express condition can do logging.
         */
        express?: (item: any) => boolean;
    }): MethodDecorator;

}

const loggerResolver = {
    canResolve: (pr: LoggerMetadata, ctx) => {
        if (!ctx.has(ConfigureLoggerManager)) {
            let local: string;
            if (pr.propertyKey && pr.paramName) {
                local = ` method ${ctx.method} param ${pr.paramName} of class `
            } else if (pr.propertyKey) {
                local = ` field ${pr.propertyKey} of class `
            } else {
                local = ' ';
            }
            throw new ArgumentError(`Autowired logger in${local}${ctx.target} failed. It denpendence on LogModule in package '@tsdi/logs',  please register LogModule first. `);
        }
        return !!pr.logname;
    },
    resolve: (pr: LoggerMetadata, ctx) => {
        const loggerManager = ctx.get(ConfigureLoggerManager);
        let level = pr.level;
        if (pr.config) {
            if (!level) {
                level = pr.config.level;
            }
            loggerManager.configure(pr.config);
        }
        const logger = loggerManager.getLogger(pr.logname);
        if (level) logger.level = level;
        return logger;
    }
} as OperationArgumentResolver;


/**
 * Logger decorator, for method or class.
 *
 * @Logger
 */
export const Logger: Logger<LoggerMetadata> = createDecorator<LoggerMetadata>('Logger', {
    actionType: [ActionTypes.paramInject, ActionTypes.propInject],
    init: (ctx) => {
        if (ctx.decorType === Decors.parameter || ctx.decorType === Decors.property) {
            const metadata = ctx.metadata as LoggerMetadata;
            if (!metadata.logname) {
                metadata.logname = lang.getClassName(ctx.reflect.type);
                metadata.resolver = loggerResolver;
            }
            metadata.propertyKey = ctx.propertyKey;
        }
    },
    props: (...args: any[]) => {
        if (args.length === 1) {
            const logname = isString(args[0]) ? args[0] : lang.getClassName(args[0]);
            return {
                logname,
                resolver: loggerResolver
            };
        } else if (args.length >= 2) {
            const [message, logname, level] = args;
            if (isString(logname)) {
                return { message, logname, level };
            } else {
                return { message, ...logname };
            }
        }
        return EMPTY_OBJ;
    }
});
