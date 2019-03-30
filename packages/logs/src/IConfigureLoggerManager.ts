import { ILoggerManager } from './ILoggerManager';
import { LogConfigure } from './LogConfigure';
import { Type } from '@tsdi/ioc';


/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 * @interface IConfigureLoggerManager
 * @extends {ILoggerManager}
 */
export interface IConfigureLoggerManager extends ILoggerManager {
    /**
     * readonly config.
     *
     * @type {LogConfigure}
     * @memberof IConfigureLoggerManager
     */
    readonly config: LogConfigure;

    /**
     * set log configure.
     *
     * @param {(LogConfigure | Type<LogConfigure>)} config
     * @memberof IConfigureLoggerManager
     */
    setLogConfigure(config: LogConfigure | Type<LogConfigure>);

}
