import { TypeMetadata, ResolveInterceptorLike, AbstractType, PropParamDecorator } from '@tsdi/ioc';
import { Level } from './Level';
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
    adapter?: string | AbstractType;
    /**
     * log for target type.
     */
    target?: AbstractType;
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
    resolver?: ResolveInterceptorLike[];
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
    (name?: string | AbstractType): PropParamDecorator;
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
        logname?: string | AbstractType;
        /**
         * adapter manager name
         */
        adapter?: string | AbstractType;
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
        logname?: string | AbstractType;
        /**
         * adapter manager name
         */
        adapter?: string | AbstractType;
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
/**
 * InjectLog decorator, for method or class.
 *
 * 日志注入修饰器
 *
 * @InjectLog
 */
export declare const InjectLog: Log<LogMetadata>;
export declare const Log: Log<LogMetadata>;
