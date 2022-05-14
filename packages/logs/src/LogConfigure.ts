import { Abstract, Token } from '@tsdi/ioc';
import { LOGFormater } from './formater';
import { LoggerManager } from './LoggerManager';

/**
 * log configure. config logger format, looger adapter.
 *
 * @export
 * @interface LogConfigure
 */
@Abstract()
export abstract class LogConfigure {
    /**
     * log adapter
     *
     * @type {Token<LoggerManager>}
     */
    abstract get adapter(): Token<LoggerManager>;

    /**
     * logger config options.
     *
     * @type {Record<string, any>}
     */
    abstract config?: Record<string, any>;

    /**
     * format
     */
    abstract format?: LOGFormater;
}
