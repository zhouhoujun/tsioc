import { LogFormater } from './LogFormater';

/**
* symbols of aop log module.
*/
export interface LogSymbols {

    /**
     * Log formater interface symbol.
     * it is a symbol id, you can register yourself formater for log.
     */
    LogFormater: symbol,

    /**
     * Log configure interface symbol.
     * it is a symbol id, you can register yourself LogConfigure for this.
     */
    LogConfigure: symbol;

    /**
     * LoggerManger interface symbol.
     * it is a symbol id, you can register yourself LoggerManger for this.
     */
    ILoggerManager: symbol;

    /**
     * IConfigureLoggerManager interface symbol.
     * it is a symbol id, you can register yourself IConfigureLoggerManager for this.
     */
    IConfigureLoggerManager: symbol;
}


/**
 * symbols of aop log module.
 */
export const LogSymbols: LogSymbols = {

    /**
     * Log formater interface symbol.
     * it is a symbol id, you can register yourself formater for log.
     */
    LogFormater: Symbol('__IOC_LogFormater'),

    /**
     * Log configure interface symbol.
     * it is a symbol id, you can register yourself LogConfigure for this.
     */
    LogConfigure: Symbol('__IOC_LogConfigure'),

    /**
     * LoggerManger interface symbol.
     * it is a symbol id, you can register yourself LoggerManger for this.
     */
    ILoggerManager: Symbol('__IOC_ILoggerManager'),

    /**
     * IConfigureLoggerManager interface symbol.
     * it is a symbol id, you can register yourself IConfigureLoggerManager for this.
     */
    IConfigureLoggerManager: Symbol('__IOC_IConfigureLoggerManager')
}
