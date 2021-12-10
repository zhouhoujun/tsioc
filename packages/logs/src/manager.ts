import { EMPTY_OBJ, getToken, Inject, Injectable, Injector, isFunction, isString, Singleton, Token, Type } from '@tsdi/ioc';
import { LogConfigure, LogConfigureToken } from './LogConfigure';
import { ILogger } from './ILogger';
import { Level, Levels } from './Level';
import { LoggerConfig, LoggerManager } from './LoggerManager';



/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 */
@Injectable()
export class ConfigureLoggerManager implements LoggerManager {
    static ρNPT = true;

    private _config!: LogConfigure;
    private _logManger!: LoggerManager;

    constructor(@Inject() protected injector: Injector) {
    }

    get config(): LogConfigure {
        if (!this._config) {
            if (this.injector.has(LogConfigureToken)) {
                this._config = this.injector.resolve(LogConfigureToken);
            } else {
                this._config = { adapter: 'console' };
            }
        }
        return this._config;
    }

    setLogConfigure(config?: LogConfigure | Type<LogConfigure>) {
        if (!config) {
            return;
        }
        if (isFunction(config)) {
            if (!this.injector.has(LogConfigureToken)) {
                this.injector.register({ provide: LogConfigureToken, useClass: config });
                this._config = this.injector.get(LogConfigureToken);
            } else if (!this.injector.has(config)) {
                this.injector.register(config);
                this._config = this.injector.get<LogConfigure>(config);
            }
        } else {
            this._config = config;
        }
        this._logManger = null!;

    }


    protected get logManger(): LoggerManager {
        if (!this._logManger) {
            let cfg: LogConfigure = this.config || <LogConfigure>EMPTY_OBJ;
            let adapter = cfg.adapter || 'console';
            let token: Token;
            if (isString(adapter)) {
                token = getToken(LoggerManager, adapter);
            } else {
                token = adapter;
            }
            this._logManger = this.injector.get<LoggerManager>(token);
            if (cfg.config) {
                this._logManger.configure(cfg.config);
            }
        }
        return this._logManger;
    }


    configure(config: any) {
        this.logManger.configure(config);
    }

    getLogger(name?: string): ILogger {
        return this.logManger.getLogger(name);
    }
}


/**
 * console logger configuration.
 *
 * @export
 * @interface ConsoleLoggerConfig
 * @extends {LoggerConfig}
 */
export interface ConsoleLoggerConfig extends LoggerConfig {
    level?: string;
}

/**
 * console log manager.
 *
 * @export
 * @class ConsoleLogManager
 * @implements {ILoggerManager}
 */
@Singleton()
@Injectable(LoggerManager, 'console')
export class ConsoleLogManager implements LoggerManager {
    static ρNPT = true;

    private logger: ILogger;
    constructor() {
        this.logger = new ConsoleLog();
    }
    configure(config: ConsoleLoggerConfig) {
        if (config && config.level) {
            this.logger.level = config.level;
        }
    }
    getLogger(name?: string): ILogger {
        return this.logger;
    }

}

/**
 * console log.
 *
 * @class ConsoleLog
 * @implements {ILogger}
 */
class ConsoleLog implements ILogger {

    level: Level = 'info';

    protected machLevel(level: Levels): boolean {
        return (Levels as any)[this.level] <= level;
    }

    log(...args: any[]): void {
        console.log(...args);
    }

    trace(...args: any[]): void {
        if (this.machLevel(Levels.trace)) {
            console.debug(...args);
        }
    }
    debug(...args: any[]): void {
        // console.debug in nuix will not console.
        if (this.machLevel(Levels.debug)) {
            console.debug(...args);
        }
    }
    info(...args: any[]): void {
        if (this.machLevel(Levels.info)) {
            console.info(...args);
        }
    }
    warn(...args: any[]): void {
        if (this.machLevel(Levels.warn)) {
            console.warn(...args);
        }
    }
    error(...args: any[]): void {
        if (this.machLevel(Levels.error)) {
            console.error(...args);
        }
    }
    fatal(...args: any[]): void {
        if (this.machLevel(Levels.fatal)) {
            console.error(...args);
        }
    }
}


