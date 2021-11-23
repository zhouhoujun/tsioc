import { ILogger, Logger } from '@tsdi/logs';
import { AbstractServer } from './server';

export class WSServer extends AbstractServer {

    @Logger() logger!: ILogger;
    
}
