import { Injectable, IContainer, symbols, Inject, isString, isUndefined, Token, Registration, Type, isClass } from '@ts-ioc/core';
import { ILoggerManger } from './ILoggerManger';
import { LogSymbols } from './symbols';
import { LogConfigure } from './LogConfigure';
import { ILogger } from './ILogger';
import { DefaultLogConfigure } from './DefaultLogConfigure';
import { IConfigureLoggerManager } from './IConfigureLoggerManager';
import { NonePointcut } from '@ts-ioc/aop';

/**
 * Configure logger manger.
 *
 * @export
 * @class LoggerManger
 * @implements {IConfigureLoggerManager}
 */
@NonePointcut()
@Injectable(LogSymbols.IConfigureLoggerManager)
export class ConfigureLoggerManger implements IConfigureLoggerManager {

    private _config: LogConfigure;
    private _logManger: ILoggerManger;

    constructor(@Inject(symbols.IContainer) protected container: IContainer, config?: LogConfigure | Type<LogConfigure>) {
        this.setLogConfigure(config);
    }


    get config(): LogConfigure {
        if (!this._config) {
            if (!this.container.has(LogSymbols.LogConfigure)) {
                this.container.register(DefaultLogConfigure);
            }
            this._config = this.container.resolve<LogConfigure>(LogSymbols.LogConfigure);
        }
        return this._config;
    }

    setLogConfigure(config: LogConfigure | Type<LogConfigure>) {
        if (!config) {
            return;
        }
        if (isClass(config)) {
            if (!this.container.has(LogSymbols.LogConfigure)) {
                this.container.register(LogSymbols.LogConfigure, config);
                this._config = this.container.get<LogConfigure>(LogSymbols.LogConfigure);
            } else if (!this.container.has(config)) {
                this.container.register(config);
                this._config = this.container.get<LogConfigure>(config);
            }
        } else {
            this._config = config;
        }
        this._logManger = null;

    }


    protected get logManger(): ILoggerManger {
        if (!this._logManger) {
            let cfg: LogConfigure = this.config || <LogConfigure>{};
            let adapter = cfg.adapter || 'console';
            let token: Token<any>;
            if (isString(adapter)) {
                token = new Registration(LogSymbols.ILoggerManager, adapter);
            } else {
                token = adapter;
            }
            this._logManger = this.container.get<ILoggerManger>(token);
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
