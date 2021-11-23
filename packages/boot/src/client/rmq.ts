import { ILogger, Logger } from '@tsdi/logs';
import { AbstractClient } from './client';


export class RMQClient extends AbstractClient {

    @Logger() logger!: ILogger;

}
