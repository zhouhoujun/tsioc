import { ILoggerManger } from './ILoggerManger';
import { LogConfigure } from './LogConfigure';

export interface IConfigureLoggerManager extends ILoggerManger {
    /**
     * readonly config
     *
     * @type {LogConfigure}
     * @memberof IConfigureLoggerManager
     */
    readonly config: LogConfigure
}
