import { ILogger, Logger } from '@tsdi/logs';
import { AbstractServer } from './server';

export class NATSServer extends AbstractServer {

    @Logger() logger!: ILogger;
    
}
