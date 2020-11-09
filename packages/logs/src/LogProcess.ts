import { Abstract, Type, Inject, INJECTOR } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { Joinpoint } from '@tsdi/aop';
import { Level } from './Level';
import { LoggerMetadata } from './decorators/Logger';
import { LogConfigure } from './LogConfigure';
import { ILogger } from './ILogger';
import { ConfigureLoggerManager } from './manager';
import { ILoggerManager } from './ILoggerManager';



/**
 *  Log process.
 */
@Abstract()
export abstract class LogProcess {

    private _logger: ILogger;
    private _logManger: ILoggerManager;

    constructor(
        @Inject(INJECTOR) protected injector: ICoreInjector,
        private config?: LogConfigure | Type<LogConfigure>) {
    }

    get logger(): ILogger {
        if (!this._logger) {
            this._logger = this.getLogger();
        }
        return this._logger;
    }

    get logManger(): ILoggerManager {
        if (!this._logManger) {
            this._logManger = this.getLoggerManager();
        }
        return this._logManger;
    }

    protected getLoggerManager(): ILoggerManager {
        return this.injector.resolve(ConfigureLoggerManager, { provide: 'config', useValue: this.config });
    }

    protected getLogger(): ILogger {
        return this.logManger.getLogger();
    }
    abstract processLog(joinPoint: Joinpoint, ...messages: any[]);
    abstract processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]);
    abstract processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], ...messages: any[]);
    abstract processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], level: Level, ...messages: any[]);
}
