import { ILogger, Logger } from '@tsdi/logs';
import { AbstractServer } from './server';

export class RedisServer extends AbstractServer {

    @Logger() logger!: ILogger;
    
}
