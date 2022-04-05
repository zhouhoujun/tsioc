import { EMPTY_OBJ, getToken, Inject, Injectable, Injector, isFunction, isString, Token, Type } from '@tsdi/ioc';
import { Logger } from './logger';
import { LogConfigure } from './LogConfigure';
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
            if (this.injector.has(LogConfigure)) {
                this._config = this.injector.resolve(LogConfigure);
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
            if (!this.injector.has(LogConfigure)) {
                this.injector.register({ provide: LogConfigure, useClass: config });
                this._config = this.injector.get(LogConfigure);
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


    configure(config: LoggerConfig) {
        this.logManger.configure(config);
    }

    getLogger(name?: string): Logger {
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
    level?: Level;
}

/**
 * console log manager.
 *
 * @export
 * @class ConsoleLogManager
 * @implements {ILoggerManager}
 */
@Injectable(LoggerManager, 'console')
export class ConsoleLogManager implements LoggerManager {
    static ρNPT = true;
    private config: ConsoleLoggerConfig | undefined;

    constructor() {
    }

    configure(config: ConsoleLoggerConfig) {
        this.config = config;
    }

    getLogger(name?: string): Logger {
        return new ConsoleLog(name, this.config?.level);
    }

}

/**
 * console log.
 *
 * @class ConsoleLog
 * @implements {Logger}
 */
class ConsoleLog implements Logger {
    static ρNPT = true;
    readonly name: string | undefined;
    formatHeader = true;

    constructor(name?: string, public level: Level = 'info') {
        this.name = name;
    }

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
            console.warn(this.name, ...args);
        }
    }
    error(...args: any[]): void {
        if (this.machLevel(Levels.error)) {
            console.error(...args);
        }
    }
    fatal(...args: any[]): void {
        if (this.machLevel(Levels.fatal)) {
            console.error(this.name, ...args);
        }
    }
}


