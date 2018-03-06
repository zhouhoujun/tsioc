import { Injectable, Singleton, NonePointcut } from '../core/index';
import { ILoggerManger } from './ILoggerManger';
import { ILogger } from './ILogger';

@NonePointcut
@Singleton
@Injectable('log4js')
export class Log4jsAdapter implements ILoggerManger {
    private log4js: any;
    constructor() {
        this.log4js = require('log4js');
    }
    configure(config: any) {
        this.log4js.configure(config);
    }
    getLogger(name?: string): ILogger {
        return this.log4js.getLogger(name);
    }

}
