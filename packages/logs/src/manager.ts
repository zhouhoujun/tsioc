import {
    ArgumentError, EMPTY_OBJ, getToken, Inject, Injectable,
    Injector, isFunction, isString, Nullable, Token, Type
} from '@tsdi/ioc';
import { HeaderFormater, Logger } from './logger';
import { LogConfigure } from './LogConfigure';
import { Level, Levels, levels } from './Level';
import { LoggerConfig, LoggerManager } from './LoggerManager';

/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 */
@Injectable()
export class ConfigureLoggerManager implements LoggerManager {
    static ƿNPT = true;

    private _config!: LogConfigure;
    private _logManger!: LoggerManager;

    constructor(@Inject() protected injector: Injector) {
    }

    get config(): LogConfigure {
        if (!this._config) {
            if (this.injector.has(LogConfigure)) {
                this._config = this.injector.resolve(LogConfigure)
            } else {
                this._config = { adapter: 'console' }
            }
        }
        return this._config
    }

    setLogConfigure(config?: LogConfigure | Type<LogConfigure>) {
        if (!config) {
            return
        }
        if (isFunction(config)) {
            if (!this.injector.has(LogConfigure)) {
                this.injector.register({ provide: LogConfigure, useClass: config });
                this._config = this.injector.get(LogConfigure)
            } else if (!this.injector.has(config)) {
                this.injector.register(config);
                this._config = this.injector.get<LogConfigure>(config)
            }
        } else {
            this._config = config
        }
        this._logManger = null!
    }


    protected get logManger(): LoggerManager {
        if (!this._logManger) {
            const cfg: LogConfigure = this.config || <LogConfigure>EMPTY_OBJ;
            const adapter = cfg.adapter || 'console';
            let token: Token;
            if (isString(adapter)) {
                token = getToken(LoggerManager, adapter)
            } else {
                token = adapter
            }
            this._logManger = this.injector.get<LoggerManager>(token);
            if (!this._logManger) {
                throw new ArgumentError(`has no provider for LoggerManager ${token.toString()}.`)
            }
            if (cfg.config) {
                this._logManger.configure(cfg.config)
            }
        }
        return this._logManger
    }

    configure(config: LoggerConfig) {
        this.logManger.configure(config)
    }

    getLogger(name?: string): Logger {
        return this.logManger.getLogger(name)
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
    static ƿNPT = true;
    private config: ConsoleLoggerConfig | undefined;

    constructor(@Nullable() private headerFormater: HeaderFormater) {
    }

    configure(config: ConsoleLoggerConfig) {
        this.config = config
    }

    getLogger(name?: string): Logger {
        return new ConsoleLog(name, this.config?.level, this.headerFormater)
    }

}

/**
 * console log.
 *
 * @class ConsoleLog
 * @implements {Logger}
 */
class ConsoleLog implements Logger {
    static ƿNPT = true;
    readonly name: string | undefined;
    formatHeader = true;

    constructor(name?: string, public level: Level = 'debug', private headerFormater?: HeaderFormater | null) {
        this.name = name;
    }

    protected machLevel(level: Levels): boolean {
        return (Levels as Record<Level, number>)[this.level] <= level
    }

    protected getHeader(level: string): string[] {
        if (this.headerFormater) {
            return this.headerFormater.format(this.name ?? '', level.toUpperCase());
        }
        return [`[${new Date().toISOString()}]`, `[${level.toUpperCase()}]`, this.name ?? '', '-'];
    }

    log(...args: any[]): void {
        console.log(...this.getHeader(levels[0]), ...args)
    }

    trace(...args: any[]): void {
        if (this.machLevel(Levels.trace)) {
            console.trace(...this.getHeader(levels[1]), ...args)
        }
    }
    debug(...args: any[]): void {
        // console.debug in nuix will not console.
        if (this.machLevel(Levels.debug)) {
            console.debug(...this.getHeader(levels[2]), ...args)
        }
    }
    info(...args: any[]): void {
        if (this.machLevel(Levels.info)) {
            console.info(...this.getHeader(levels[3]), ...args)
        }
    }
    warn(...args: any[]): void {
        if (this.machLevel(Levels.warn)) {
            console.warn(...this.getHeader(levels[4]), ...args)
        }
    }
    error(...args: any[]): void {
        if (this.machLevel(Levels.error)) {
            console.error(...this.getHeader(levels[5]), ...args)
        }
    }
    fatal(...args: any[]): void {
        if (this.machLevel(Levels.fatal)) {
            console.error(...this.getHeader(levels[6]), ...args)
        }
    }
}
