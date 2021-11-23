import { ILogger, Logger } from '@tsdi/logs';
import { AbstractServer } from './server';

export class MQTTServer extends AbstractServer {

    @Logger() logger!: ILogger;
    
}
