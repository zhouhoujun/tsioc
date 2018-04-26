
/**
* symbols of aop log module.
*/
export interface LogSymbols {
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
     * Log configure interface symbol.
     * it is a symbol id, you can register yourself LogConfigure for this.
     */
    LogConfigure: Symbol('LogConfigure'),

    /**
     * LoggerManger interface symbol.
     * it is a symbol id, you can register yourself LoggerManger for this.
     */
    ILoggerManager: Symbol('ILoggerManager'),

    /**
     * IConfigureLoggerManager interface symbol.
     * it is a symbol id, you can register yourself IConfigureLoggerManager for this.
     */
    IConfigureLoggerManager: Symbol('IConfigureLoggerManager')
}
