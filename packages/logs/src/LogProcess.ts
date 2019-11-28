import { Abstract, Type, ObjectMapProvider, Inject } from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { Joinpoint } from '@tsdi/aop';
import { Level } from './Level';
import { LoggerMetadata } from './decorators/Logger';
import { LogConfigure } from './LogConfigure';
import { ILogger } from './ILogger';
import { IConfigureLoggerManager } from './IConfigureLoggerManager';
import { ConfigureLoggerManger } from './ConfigureLoggerManger';


/**
 *  Log process.
 */
@Abstract()
export abstract class LogProcess {

    private _logger: ILogger;
    private _logManger: IConfigureLoggerManager;

    constructor(@Inject(ContainerToken) protected container: IContainer, private config?: LogConfigure | Type<LogConfigure>) {

    }

    get logger(): ILogger {
        if (!this._logger) {
            this._logger = this.logManger.getLogger();
        }
        return this._logger;
    }

    get logManger(): IConfigureLoggerManager {
        if (!this._logManger) {
            this._logManger = this.container.resolve(ConfigureLoggerManger, ObjectMapProvider.parse({ config: this.config }));
        }
        return this._logManger;
    }

    abstract processLog(joinPoint: Joinpoint, ...messages: any[]);
    abstract processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]);
    abstract processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], ...messages: any[]);
    abstract processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], level: Level, ...messages: any[]);
}
