import {
    ArgumentException, getToken, Inject, Injectable,
    Injector, isString, noPointcut, Nullable, Token, AbstractType,
    InjectUtil
} from '@tsdi/ioc';
import { HeaderFormater, Logger } from './logger';
import { LOG_CONFIGURES, LogConfigure } from './LogConfigure';
import { Level, Levels, levels } from './Level';
import { LoggerConfig, LoggerManager } from './LoggerManager';

/**
 * Any value used to register a {@link LoggerManager}: an adapter name, an
 * adapter type or the resolved DI token.
 */
type LoggerAdapterKey = string | AbstractType | Token<LoggerManager>;

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
    static [noPointcut] = true;

    private maps: Map<string | Token<LoggerManager>, LoggerManager>;
    private cfgs: Map<string | Token<LoggerManager>, LogConfigure>;
    /**
     * Configuration last applied per adapter. Reading a logger is a hot path
     * (every `getLogger` call goes through {@link getLoggerManager}), and
     * adapters such as log4js rebuild all appenders on `configure`; applying
     * the same configuration object again would redo that work for nothing.
     */
    private applied: Map<LoggerAdapterKey | undefined, Record<string, any> | string>;
    private _defaultLogMgr!: LoggerManager;
    private _defaultCfg!: LogConfigure;
    constructor(@Inject() protected injector: Injector) {
        this.maps = new Map();
        this.cfgs = new Map();
        this.applied = new Map();
    }

    hasConfigure(adapter?: string | AbstractType): boolean {
        return adapter ? this.cfgs.has(adapter) : this.cfgs.size > 0;
    }

    getConfigure(adapter?: string | AbstractType): LogConfigure {
        return adapter ? this.cfgs.get(adapter)! : this._defaultCfg;
    }

    getLoggerManager(adapter?: string | AbstractType): LoggerManager {
        this.init();
        if (!adapter) {
            // Key the default configuration by its own adapter so it shares the
            // "already applied" entry recorded during init.
            this.applyConfigure(this._defaultCfg?.adapter, this._defaultCfg, this._defaultLogMgr);
            return this._defaultLogMgr;
        }
        const mgr = this.maps.get(adapter);
        if (!mgr) {
            throw new ArgumentException(`has no provider for LoggerManager ${adapter.toString()}.`)
        }
        this.applyConfigure(adapter, this.cfgs.get(adapter), mgr);
        return mgr;
    }

    /**
     * Apply a configuration once per adapter. Re-reading a logger must not
     * rebuild the adapter's transports; an explicit {@link configure} call
     * always applies and takes over from the startup configuration.
     */
    private applyConfigure(key: LoggerAdapterKey | undefined, cfg: LogConfigure | undefined, mgr: LoggerManager | undefined): void {
        const config = cfg?.config;
        if (!config || !mgr) {
            return;
        }
        if (this.applied.get(key) === config) {
            return;
        }
        this.applied.set(key, config);
        mgr.configure(config);
    }


    configure(config: LoggerConfig, adapter?: string | AbstractType) {
        this.init();
        const mgr = adapter ? this.maps.get(adapter) : this._defaultLogMgr;
        if (!mgr) {
            throw new ArgumentException(`has no provider for LoggerManager ${adapter!.toString()}.`)
        }
        // Keep the stored configure in sync: an explicit call takes over from
        // the startup configuration instead of being re-applied over it.
        const key = adapter ?? this._defaultCfg?.adapter;
        const cfg = key === undefined ? undefined : this.cfgs.get(key);
        if (cfg) {
            cfg.config = config;
        }
        this.applied.set(key, config);
        mgr.configure(config)
    }

    getLogger(name?: string, adapter?: string | AbstractType): Logger {
        return this.getLoggerManager(adapter)?.getLogger(name)
    }

    private inited = false;
    protected init() {
        if (this.inited) return;
        if (!this.injector.has(LOG_CONFIGURES)) {
            InjectUtil.provider(this.injector, { provide: LOG_CONFIGURES, useValue: { adapter: 'console' }, multi: true });
        }
        this.inited = true;
        const configs = this.injector.get(LOG_CONFIGURES);
        if (configs.length === 1 || !configs.some(v => v.asDefault)) {
            configs[0].asDefault = true;
        }
        configs.forEach(cfg => {
            let token: Token<LoggerManager>;
            const adapter = cfg.adapter;
            if (isString(adapter)) {
                token = getToken(LoggerManager, adapter)
            } else {
                token = adapter
            }
            const manager = this.injector.get(token);
            if (!manager) {
                throw new ArgumentException(`has no provider for LoggerManager ${token.toString()}.`)
            }

            this.cfgs.set(adapter, cfg);

            this.applyConfigure(adapter, cfg, manager);
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
    static [noPointcut] = true;
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
    static [noPointcut] = true;
    readonly category: string;
    formatHeader = true;

    constructor(name?: string, public level: Level = 'info', private headerFormater?: HeaderFormater | null) {
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
