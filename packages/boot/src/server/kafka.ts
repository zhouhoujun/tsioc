import { ILogger, Logger } from '@tsdi/logs';
import { AbstractServer } from './server';

export class KafkaServer extends AbstractServer {

    @Logger() logger!: ILogger;
    
}
