import {
    ArgumentExecption, getToken, Inject, Injectable,
    Injector, isString, Nullable, Token, Type
} from '@tsdi/ioc';
import { HeaderFormater, Logger } from './logger';
import { LOG_CONFIGURES, LogConfigure } from './LogConfigure';
import { Level, Levels, levels } from './Level';
import { LoggerConfig, LoggerManager } from './LoggerManager';

/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 */
@Injectable({
    static: true,
    providedIn: 'root'
})
export class LoggerManagers implements LoggerManager {
    static ƿNPT = true;

    private maps: Map<string | Token<LoggerManager>, LoggerManager>;
    private cfgs: Map<string | Token<LoggerManager>, LogConfigure>;
    private _defaultLogMgr!: LoggerManager;
    private _defaultCfg!: LogConfigure;
    constructor(@Inject() protected injector: Injector) {
        this.maps = new Map();
        this.cfgs = new Map();
    }

    hasConfigure(adapter?: string | Type): boolean {
        return adapter ? this.cfgs.has(adapter) : this.cfgs.size > 0;
    }

    getConfigure(adapter?: string | Type): LogConfigure {
        return adapter ? this.cfgs.get(adapter)! : this._defaultCfg;
    }

    getLoggerManager(adapter?: string | Type): LoggerManager {
        this.init();
        if (!adapter) return this._defaultLogMgr;
        const mgr = this.maps.get(adapter);
        if (!mgr) {
            throw new ArgumentExecption(`has no provider for LoggerManager ${adapter.toString()}.`)
        }
        return mgr;
    }


    configure(config: LoggerConfig, adapter?: string | Type) {
        this.getLoggerManager(adapter).configure(config)
    }

    getLogger(name?: string, adapter?: string | Type): Logger {
        return this.getLoggerManager(adapter)?.getLogger(name)
    }

    private inited = false;
    protected init() {
        if (this.inited) return;
        if (!this.injector.has(LOG_CONFIGURES)) {
            this.injector.inject({ provide: LOG_CONFIGURES, useValue: { adapter: 'console' }, multi: true });
        }
        this.inited = true;
        const configs = this.injector.get(LOG_CONFIGURES);
        if (configs.length === 1 || !configs.some(v => v.asDefault)) {
            configs[0].asDefault = true;
        }
        configs.forEach(cfg => {
            let token: Token<LoggerManager>;
            const adapter = cfg.adapter;
            if (this.maps.has(adapter)) return;
            if (isString(adapter)) {
                token = getToken(LoggerManager, adapter)
            } else {
                token = adapter
            }
            const manager = this.injector.get(token);
            if (!manager) {
                throw new ArgumentExecption(`has no provider for LoggerManager ${token.toString()}.`)
            }

            this.cfgs.set(adapter, cfg);

            cfg.config && manager.configure(cfg.config);
            if (cfg.asDefault) {
                this._defaultLogMgr = manager;
                this._defaultCfg = cfg;
            }
            this.maps.set(adapter, manager);
        });
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
export class ConsoleLog implements Logger {
    static ƿNPT = true;
    readonly category: string;
    formatHeader = true;

    constructor(name?: string, public level: Level = 'debug', private headerFormater?: HeaderFormater | null) {
        this.category = name || 'default';
    }

    protected machLevel(level: Levels): boolean {
        return (Levels as Record<Level, number>)[this.level] <= level
    }

    protected getHeader(level: string): string[] {
        if (this.headerFormater) {
            return this.headerFormater.format(this.category ?? '', level.toUpperCase());
        }
        return [`[${new Date().toISOString()}]`, `[${level.toUpperCase()}]`, this.category ?? '', '-'];
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
