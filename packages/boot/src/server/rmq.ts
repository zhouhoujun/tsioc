import { ILogger, Logger } from '@tsdi/logs';
import { AbstractServer } from './server';

export class RMQServer extends AbstractServer {

    @Logger() logger!: ILogger;
    
}
