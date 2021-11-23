import { ILogger, Logger } from '@tsdi/logs';
import { AbstractClient } from './client';

export class KafkaClient extends AbstractClient {
    
    @Logger() logger!: ILogger;


}
