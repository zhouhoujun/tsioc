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
     * @type {Token<LoggerManager>}
     */
    get adapter(): Token<LoggerManager>;
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

    /**
     * as default logger manager
     */
    asDefault?: boolean;

}

/**
 * mutil log configures
 */
export const LOG_CONFIGURES =  tokenId<LogConfigure[]>('LOG_CONFIGURES');