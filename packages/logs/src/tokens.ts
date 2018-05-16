import { LogFormaterToken, ILogFormater } from './LogFormater';
import { InjectToken } from '@ts-ioc/core';
import { LogConfigure, LogConfigureToken } from './LogConfigure';
import { ILoggerManager, LoggerManagerToken } from './ILoggerManager';
import { IConfigureLoggerManager, ConfigureLoggerManagerToken } from './IConfigureLoggerManager';

/**
* symbols of aop log module.
*/
export interface LogSymbols {

    /**
     * Log formater interface token.
     * it is a token id, you can register yourself formater for log.
     */
    LogFormater: InjectToken<ILogFormater>,

    /**
     * Log configure interface token.
     * it is a token id, you can register yourself LogConfigure for this.
     */
    LogConfigure: InjectToken<LogConfigure>;

    /**
     * LoggerManger interface token.
     * it is a token id, you can register yourself LoggerManger for this.
     */
    ILoggerManager: InjectToken<ILoggerManager>;

    /**
     * IConfigureLoggerManager interface token.
     * it is a token id, you can register yourself IConfigureLoggerManager for this.
     */
    IConfigureLoggerManager: InjectToken<IConfigureLoggerManager>;
}


/**
 * symbols of aop log module.
 */
export const LogSymbols: LogSymbols = {

    /**
     * Log formater interface token.
     * it is a token id, you can register yourself formater for log.
     */
    LogFormater: LogFormaterToken,

    /**
     * Log configure interface token.
     * it is a token id, you can register yourself LogConfigure for this.
     */
    LogConfigure: LogConfigureToken,

    /**
     * LoggerManger interface token.
     * it is a token id, you can register yourself LoggerManger for this.
     */
    ILoggerManager: LoggerManagerToken,

    /**
     * IConfigureLoggerManager interface token.
     * it is a token id, you can register yourself IConfigureLoggerManager for this.
     */
    IConfigureLoggerManager: ConfigureLoggerManagerToken
}
