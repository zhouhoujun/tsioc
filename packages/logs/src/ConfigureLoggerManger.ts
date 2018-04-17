import { Injectable, IContainer, symbols, Inject, isUndefined, Token, Registration } from '@ts-ioc/core';
import { ILoggerManger } from './ILoggerManger';
import { LogSymbols } from './symbols';
import { LogConfigure } from './LogConfigure';
import { ILogger } from './ILogger';
import { DefaultLogConfigure } from './DefaultLogConfigure';
import { IConfigureLoggerManager } from './IConfigureLoggerManager';
import { NonePointcut } from '@ts-ioc/aop';
import { isString } from 'util';

/**
 * Configure logger manger.
 *
 * @export
 * @class LoggerManger
 * @implements {IConfigureLoggerManager}
 */
@Injectable(LogSymbols.IConfigureLoggerManager)
@NonePointcut
export class ConfigureLoggerManger implements IConfigureLoggerManager {

    private _config: LogConfigure;
    private _logManger: ILoggerManger;

    constructor(@Inject(symbols.IContainer) protected container: IContainer, config?: LogConfigure) {
        if (config) {
            this._config = config;
        }
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
