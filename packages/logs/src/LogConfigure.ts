import { Token, ObjectMap, InjectToken } from '@ts-ioc/core';
import { ILoggerManager } from './ILoggerManager';
import { LOGFormater } from './LogFormater';

/**
 * Log configure interface symbol.
 * it is a symbol id, you can register yourself LogConfigure for this.
 */
export const LogConfigureToken = new InjectToken<LogConfigure>('DI_LogConfigure');

/**
 * log configure. config logger format, looger adapter.
 *
 * @export
 * @interface LogConfigure
 */
export interface LogConfigure {
    /**
     * log adapter
     *
     * @type {Token<ILoggerManager>)}
     * @memberof LogConfigure
     */
    adapter: Token<ILoggerManager>,

    /**
     * logger config options.
     *
     * @type {ObjectMap<any>}
     * @memberof LogConfigure
     */
    config?: ObjectMap<any>;

    /**
     * format
     */
    format?: LOGFormater;
}
