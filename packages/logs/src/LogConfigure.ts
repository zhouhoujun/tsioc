import { Token, tokenId } from '@tsdi/ioc';
import { LOGFormater } from './formater';
import { LoggerManager } from './LoggerManager';

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
     * @type {Token<LoggerManager>)}
     */
    adapter: Token<LoggerManager>,

    /**
     * logger config options.
     *
     * @type {Record<string, any>}
     */
    config?: Record<string, any>;

    /**
     * format
     */
    format?: LOGFormater;
}

/**
 * Log configure interface symbol.
 * it is a symbol id, you can register yourself LogConfigure for this.
 */
 export const LogConfigureToken: Token<LogConfigure> = tokenId<LogConfigure>('DI_LogConfigure');