import { Injector, noPointcut, AbstractType } from '@tsdi/ioc';
import { HeaderFormater, Logger } from './logger';
import { LogConfigure } from './LogConfigure';
import { Level, Levels } from './Level';
import { LoggerConfig, LoggerManager } from './LoggerManager';
/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 */
export declare class LoggerManagers implements LoggerManager {
    protected injector: Injector;
    static [noPointcut]: boolean;
    private maps;
    private cfgs;
    private _defaultLogMgr;
    private _defaultCfg;
    constructor(injector: Injector);
    hasConfigure(adapter?: string | AbstractType): boolean;
    getConfigure(adapter?: string | AbstractType): LogConfigure;
    getLoggerManager(adapter?: string | AbstractType): LoggerManager;
    configure(config: LoggerConfig, adapter?: string | AbstractType): void;
    getLogger(name?: string, adapter?: string | AbstractType): Logger;
    private inited;
    protected init(): void;
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
export declare class ConsoleLogManager implements LoggerManager {
    private headerFormater;
    static [noPointcut]: boolean;
    private config;
    constructor(headerFormater: HeaderFormater);
    configure(config: ConsoleLoggerConfig): void;
    getLogger(name?: string): Logger;
}
/**
 * console log.
 *
 * @class ConsoleLog
 * @implements {Logger}
 */
export declare class ConsoleLog implements Logger {
    level: Level;
    private headerFormater?;
    static [noPointcut]: boolean;
    readonly category: string;
    formatHeader: boolean;
    constructor(name?: string, level?: Level, headerFormater?: (HeaderFormater | null) | undefined);
    protected machLevel(level: Levels): boolean;
    protected getHeader(level: string): string[];
    log(...args: any[]): void;
    trace(...args: any[]): void;
    debug(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    fatal(...args: any[]): void;
}
