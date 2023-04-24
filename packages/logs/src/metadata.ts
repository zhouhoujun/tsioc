import {
    TypeMetadata, createDecorator, EMPTY_OBJ, OperationArgumentResolver, Type, isString,
    lang, PropParamDecorator, ArgumentExecption, Decors, ActionTypes, ClassType, isDefined
} from '@tsdi/ioc';
import { Level } from './Level';
import { LoggerManagers } from './manager';


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
     * adapter manager name
     */
    adapter?: string | Type;
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
         * adapter manager name
         */
        adapter?: string | Type;
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
        logname?: string | Type;
        /**
         * adapter manager name
         */
        adapter?: string | Type;
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
        const managers = ctx.get(LoggerManagers);
        if (!managers) {
            let local: string;
            if (pr.propertyKey && pr.paramName) {
                local = ` method ${ctx.methodName} param ${pr.paramName} of class `
            } else if (pr.propertyKey) {
                local = ` field ${pr.propertyKey} of class `
            } else {
                local = ' '
            }
            throw new ArgumentExecption(`Autowired logger in${local}${ctx.targetType} failed. It denpendence on LoggerModule in package '@tsdi/logs',  please register LoggerModule first. `)
        }
        const adapter = pr.adapter;
        if (!managers.getLoggerManager(adapter)) {
            let local: string;
            if (pr.propertyKey && pr.paramName) {
                local = ` method ${ctx.methodName} param ${pr.paramName} of class `
            } else if (pr.propertyKey) {
                local = ` field ${pr.propertyKey} of class `
            } else {
                local = ' '
            }
            throw new ArgumentExecption(`Autowired logger in${local}${ctx.targetType} failed. It denpendence on '${adapter}' adapter,  please register LogConfigure first. `)
        }

        return isDefined(pr.logname || pr.target)
    },
    resolve: (pr: LogMetadata, ctx, target?: ClassType) => {
        const managers = ctx.get(LoggerManagers);
        const level = pr.level;
        const logger = managers.getLogger(pr.logname ?? lang.getClassName(target ?? pr.target), pr.adapter);
        if (level) logger.level = level;
        return logger
    }
} as OperationArgumentResolver;


/**
 * InjectLog decorator, for method or class.
 * 
 * 日志注入修饰器
 *
 * @InjectLog
 */
export const InjectLog: Log<LogMetadata> = createDecorator<LogMetadata>('InjectLog', {
    actionType: [ActionTypes.paramInject, ActionTypes.propInject],
    init: (ctx) => {
        if (ctx.define.decorType === Decors.parameter || ctx.define.decorType === Decors.property) {
            const metadata = ctx.define.metadata as LogMetadata;
            if (!metadata.logname) {
                metadata.target = ctx.class.type;
                metadata.resolver = loggerResolver
            }
            metadata.propertyKey = ctx.define.propertyKey
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

export const Log = InjectLog;
