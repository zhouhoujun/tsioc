import {
    TypeMetadata, createDecorator, EMPTY_OBJ, OperationArgumentResolver, Type, isString,
    lang, PropParamDecorator, ArgumentExecption, Decors, ActionTypes, getToken, ClassType, isDefined
} from '@tsdi/ioc';
import { Level } from '../Level';
import { LogConfigure } from '../LogConfigure';
import { LoggerConfig, LoggerManager } from '../LoggerManager';


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
     * log for target type.
     */
    target?: ClassType;
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
     * @Log
     *
     * @param {string} name the logger name.  Default current class name.
     * @param options the logger options.
     */
    (name?: string | Type): PropParamDecorator;
    /**
     * inject logger for property or parameter with the name in {@link ILoggerManager}.
     * @Log
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
     * @Log
     *
     * @param {string} message set special message to logging.
     * @param {string} logname use the logger with name.  Default current class name.
     * @param {Level} [level] set log level to this message.
     */
    (message: string, logname: string, level?: Level): MethodDecorator;
    /**
     * define logger annotation pointcut to this class or method.
     * @Log
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
        if (!ctx.has(LoggerManager)) {
            let local: string;
            if (pr.propertyKey && pr.paramName) {
                local = ` method ${ctx.methodName} param ${pr.paramName} of class `
            } else if (pr.propertyKey) {
                local = ` field ${pr.propertyKey} of class `
            } else {
                local = ' '
            }
            throw new ArgumentExecption(`Autowired logger in${local}${ctx.targetType} failed. It denpendence on LogModule (in package '@tsdi/logs') or LoggerModule (in package '@tsdi/core'),  please register LogModule first. `)
        } else if (ctx.has(LogConfigure)) {
            const adapter = ctx.get(LogConfigure)?.adapter ?? 'console';
            const token = isString(adapter) ? getToken(LoggerManager, adapter) : adapter;
            if (!ctx.has(token)) {
                let local: string;
                if (pr.propertyKey && pr.paramName) {
                    local = ` method ${ctx.methodName} param ${pr.paramName} of class `
                } else if (pr.propertyKey) {
                    local = ` field ${pr.propertyKey} of class `
                } else {
                    local = ' '
                }
                throw new ArgumentExecption(`Autowired logger in${local}${ctx.targetType} failed. It denpendence on '${token.toString()}',  please register this LoggerManager first. `)
            }
        }
        return isDefined(pr.logname || pr.target)
    },
    resolve: (pr: LogMetadata, ctx, target?: ClassType) => {
        const factory = ctx.get(LoggerManager);
        let level = pr.level;
        if (pr.config) {
            if (!level) {
                level = pr.config.level
            }
            factory.configure(pr.config)
        }
        const logger = factory.getLogger(pr.logname ?? lang.getClassName(target ?? pr.target));
        if (level) logger.level = level;
        return logger
    }
} as OperationArgumentResolver;


/**
 * Logger decorator, for method or class.
 *
 * @Log
 */
export const Log: Log<LogMetadata> = createDecorator<LogMetadata>('Log', {
    actionType: [ActionTypes.paramInject, ActionTypes.propInject],
    init: (ctx) => {
        if (ctx.decorType === Decors.parameter || ctx.decorType === Decors.property) {
            const metadata = ctx.metadata as LogMetadata;
            if (!metadata.logname) {
                metadata.target = ctx.def.type;
                metadata.resolver = loggerResolver
            }
            metadata.propertyKey = ctx.propertyKey
        }
    },
    props: (...args: any[]) => {
        if (args.length === 1) {
            const logname = isString(args[0]) ? args[0] : lang.getClassName(args[0]);
            return {
                logname,
                resolver: loggerResolver
            }
        } else if (args.length >= 2) {
            const [message, logname, level] = args;
            if (isString(logname)) {
                return { message, logname, level }
            } else {
                return { message, ...logname }
            }
        }
        return EMPTY_OBJ
    }
});
