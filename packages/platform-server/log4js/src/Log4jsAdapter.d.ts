import { ApplicationArguments } from '@tsdi/core';
import { LoggerManager, Logger } from '@tsdi/logger';
import * as log4js from 'log4js';
export declare class Log4jsAdapter implements LoggerManager {
    private appArgs;
    constructor(appArgs: ApplicationArguments);
    configure(config: log4js.Configuration): void;
    getLogger(name?: string): Logger;
}
