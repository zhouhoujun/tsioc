import { Injectable, Singleton, NonePointcut } from '../core/index';
import { ILoggerManger } from './ILoggerManger';
import { ILogger } from './ILogger';

@NonePointcut
@Singleton
@Injectable('console')
export class ConsoleLogManager implements ILoggerManger {
    private logger: ILogger;
    constructor() {
        this.logger = new ConsoleLog();
    }
    configure(config: any) {

    }
    getLogger(name?: string): ILogger {
        return this.logger;
    }

}


export class ConsoleLog implements ILogger {

    level: string;

    log(...args: any[]): void {
        console.log(...args);
    }
    trace(message: string, ...args: any[]): void {
        console.trace(message, ...args);
    }
    debug(message: string, ...args: any[]): void {
        // console.debug in nuix will not console.
        console.debug(message, ...args);
    }
    info(message: string, ...args: any[]): void {
        console.info(message, ...args);
    }
    warn(message: string, ...args: any[]): void {
        console.warn(message, ...args);
    }
    error(message: string, ...args: any[]): void {
        console.error(message, ...args);
    }
    fatal(message: string, ...args: any[]): void {
        console.error(message, ...args);
    }
}
