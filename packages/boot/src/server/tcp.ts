import { ILogger, Logger } from '@tsdi/logs';
import { AbstractServer } from './server';

export class TCPServer extends AbstractServer {

    @Logger() logger!: ILogger;
    
}
