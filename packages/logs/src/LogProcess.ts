import { Abstract, Type, Injector, Inject } from '@tsdi/ioc';
import { Joinpoint } from '@tsdi/aop';
import { Level } from './Level';
import { LoggerMetadata } from './metadata/Logger';
import { LogConfigure } from './LogConfigure';
import { ILogger } from './ILogger';
import { ConfigureLoggerManager } from './manager';
import { ILoggerManager } from './ILoggerManager';



/**
 *  Log process.
 */
@Abstract()
export abstract class LogProcess {

    private _logger!: ILogger;
    private _logManger!: ILoggerManager;

    constructor(
        @Inject() protected injector: Injector,
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
        return this.injector.resolve({ token: ConfigureLoggerManager, providers: [{ provide: 'config', useValue: this.config }] });
    }

    protected getLogger(): ILogger {
        return this.logManger.getLogger();
    }
    abstract processLog(joinPoint: Joinpoint, ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], level: Level, ...messages: any[]): void;
}
