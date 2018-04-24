import { ILoggerManger } from './ILoggerManger';
import { LogConfigure } from './LogConfigure';
import { Type } from '@ts-ioc/core';

export interface IConfigureLoggerManager extends ILoggerManger {
    /**
     * readonly config
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
