import { Inject, Injectable, Injector, isFunction, isString, Registration, Singleton, Token, Type } from '@tsdi/ioc';
import { NonePointcut } from '@tsdi/aop';
import { LogConfigure } from './LogConfigure';
import { ILoggerManager, LoggerConfig, IConfigureLoggerManager } from './ILoggerManager';
import { ILogger } from './ILogger';
import { Levels } from './Level';
import { LogConfigureToken, LoggerManagerToken } from './tk';



/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 * @class LoggerManger
 * @implements {IConfigureLoggerManager}
 */
@NonePointcut()
@Injectable()
export class ConfigureLoggerManager implements IConfigureLoggerManager {

    private _config: LogConfigure;
    private _logManger: ILoggerManager;

    constructor(
        @Inject() protected injector: Injector,
        config?: LogConfigure | Type<LogConfigure>) {
        this.setLogConfigure(config);
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

    setLogConfigure(config: LogConfigure | Type<LogConfigure>) {
        if (!config) {
            return;
        }
        if (isFunction(config)) {
            if (!this.injector.has(LogConfigureToken)) {
                this.injector.register(LogConfigureToken, config);
                this._config = this.injector.getInstance(LogConfigureToken);
            } else if (!this.injector.has(config)) {
                this.injector.register(config);
                this._config = this.injector.getInstance<LogConfigure>(config);
            }
        } else {
            this._config = config;
        }
        this._logManger = null;

    }


    protected get logManger(): ILoggerManager {
        if (!this._logManger) {
            let cfg: LogConfigure = this.config || <LogConfigure>{};
            let adapter = cfg.adapter || 'console';
            let token: Token;
            if (isString(adapter)) {
                token = new Registration(LoggerManagerToken, adapter);
            } else {
                token = adapter;
            }
            this._logManger = this.injector.get<ILoggerManager>(token);
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
@NonePointcut()
@Singleton()
@Injectable(LoggerManagerToken, 'console')
export class ConsoleLogManager implements ILoggerManager {
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

    level: string;

    constructor() {

    }

    log(...args: any[]): void {
        console.log(...args);
    }

    trace(...args: any[]): void {
        if (!this.level || Levels[this.level] === 0) {
            console.debug(...args);
        }
    }
    debug(...args: any[]): void {
        // console.debug in nuix will not console.
        if (!this.level || Levels[this.level] <= 1) {
            console.debug(...args);
        }
    }
    info(...args: any[]): void {
        if (!this.level || Levels[this.level] <= 2) {
            console.info(...args);
        }
    }
    warn(...args: any[]): void {
        if (!this.level || Levels[this.level] <= 3) {
            console.warn(...args);
        }
    }
    error(...args: any[]): void {
        if (!this.level || Levels[this.level] <= 4) {
            console.error(...args);
        }
    }
    fatal(...args: any[]): void {
        if (!this.level || Levels[this.level] <= 5) {
            console.error(...args);
        }
    }
}
