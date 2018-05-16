import { LogFormaterToken, ILogFormater } from './LogFormater';
import { InjectToken } from '@ts-ioc/core';
import { LogConfigure, LogConfigureToken } from './LogConfigure';
import { ILoggerManager, ILoggerManagerToken } from './ILoggerManager';
import { IConfigureLoggerManager, ConfigureLoggerManagerToken } from './IConfigureLoggerManager';

/**
* symbols of aop log module.
*/
export interface LogSymbols {

    /**
     * Log formater interface symbol.
     * it is a symbol id, you can register yourself formater for log.
     */
    LogFormater: InjectToken<ILogFormater>,

    /**
     * Log configure interface symbol.
     * it is a symbol id, you can register yourself LogConfigure for this.
     */
    LogConfigure: InjectToken<LogConfigure>;

    /**
     * LoggerManger interface symbol.
     * it is a symbol id, you can register yourself LoggerManger for this.
     */
    ILoggerManager: InjectToken<ILoggerManager>;

    /**
     * IConfigureLoggerManager interface symbol.
     * it is a symbol id, you can register yourself IConfigureLoggerManager for this.
     */
    IConfigureLoggerManager: InjectToken<IConfigureLoggerManager>;
}


/**
 * symbols of aop log module.
 */
export const LogSymbols: LogSymbols = {

    /**
     * Log formater interface symbol.
     * it is a symbol id, you can register yourself formater for log.
     */
    LogFormater: LogFormaterToken,

    /**
     * Log configure interface symbol.
     * it is a symbol id, you can register yourself LogConfigure for this.
     */
    LogConfigure: LogConfigureToken,

    /**
     * LoggerManger interface symbol.
     * it is a symbol id, you can register yourself LoggerManger for this.
     */
    ILoggerManager: ILoggerManagerToken,

    /**
     * IConfigureLoggerManager interface symbol.
     * it is a symbol id, you can register yourself IConfigureLoggerManager for this.
     */
    IConfigureLoggerManager: ConfigureLoggerManagerToken
}
