import { ILoggerManager } from './ILoggerManager';
import { LogConfigure } from './LogConfigure';
import { Type, InjectToken } from '@ts-ioc/ioc';

/**
 * IConfigureLoggerManager interface token.
 * it is a token id, you can register yourself IConfigureLoggerManager for this.
 */
export const ConfigureLoggerManagerToken = new InjectToken<IConfigureLoggerManager>('DI_IConfigureLoggerManager');

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
