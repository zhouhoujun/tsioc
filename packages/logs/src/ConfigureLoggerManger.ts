import { Injectable, Inject, isString, Token, Registration, Type, isClass, INJECTOR } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { NonePointcut } from '@tsdi/aop';
import { ILoggerManager, LoggerManagerToken } from './ILoggerManager';
import { LogConfigure, LogConfigureToken } from './LogConfigure';
import { IConfigureLoggerManager } from './IConfigureLoggerManager';
import { ILogger } from './ILogger';


/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 * @class LoggerManger
 * @implements {IConfigureLoggerManager}
 */
@NonePointcut()
@Injectable
export class ConfigureLoggerManger implements IConfigureLoggerManager {

    private _config: LogConfigure;
    private _logManger: ILoggerManager;

    constructor(@Inject(INJECTOR) protected injector: ICoreInjector, config?: LogConfigure | Type<LogConfigure>) {
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
        if (isClass(config)) {
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
