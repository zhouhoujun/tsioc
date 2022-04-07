import {
    TypeMetadata, createDecorator, EMPTY_OBJ, OperationArgumentResolver, Type, isString,
    lang, PropParamDecorator, ArgumentError, Decors, ActionTypes
} from '@tsdi/ioc';
import { Level } from '../Level';
import { LoggerConfig, LoggerManager, LOGGER_MANAGER } from '../LoggerManager';
import { ConfigureLoggerManager } from '../manager';


/**
 * log metadata.
 *
 * @export
 * @interface LoggerMetadata
 * @extends {TypeMetadata}
 */
export interface LogMetadata extends TypeMetadata {
    /**
     * set the special name to get logger from logger manager.
     *
     * @type {string}
     */
    logname?: string;
    /**
     * param name.
     */
    paramName?: string;
    /**
     * property key.
     */
    propertyKey?: string;
    /**
     * logger config.
     */
    config?: LoggerConfig;
    /**
     * operation argument resolver.
     */
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
 * Log decorator, for method or class.
 * inject logger for property or parameter with the name in {@link ILoggerManager}.
 *
 * @Log
 *
 * @export
 * @interface Log Decorator
 * @template T
 */
export interface Log<T extends LogMetadata> {
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
    canResolve: (pr: LogMetadata, ctx) => {
        if (!ctx.has(ConfigureLoggerManager)) {
            let local: string;
            if (pr.propertyKey && pr.paramName) {
                local = ` method ${ctx.methodName} param ${pr.paramName} of class `
            } else if (pr.propertyKey) {
                local = ` field ${pr.propertyKey} of class `
            } else {
                local = ' ';
            }
            throw new ArgumentError(`Autowired logger in${local}${ctx.targetType} failed. It denpendence on LogModule in package '@tsdi/logs',  please register LogModule first. `);
        }
        return !!pr.logname;
    },
    resolve: (pr: LogMetadata, ctx) => {
        let loggerManager: LoggerManager;
        let level = pr.level;
        if (pr.config) {
            loggerManager = ctx.get(ConfigureLoggerManager);
            if (!level) {
                level = pr.config.level;
            }
            loggerManager.configure(pr.config);
        } else {
            loggerManager = ctx.get(LOGGER_MANAGER) ?? ctx.get(ConfigureLoggerManager)
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
export const Log: Log<LogMetadata> = createDecorator<LogMetadata>('Log', {
    actionType: [ActionTypes.paramInject, ActionTypes.propInject],
    init: (ctx) => {
        if (ctx.decorType === Decors.parameter || ctx.decorType === Decors.property) {
            const metadata = ctx.metadata as LogMetadata;
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
