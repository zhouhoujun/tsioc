import { ILogger, Logger } from '@tsdi/logs';
import { AbstractClient } from './client';


export class NATSClient extends AbstractClient {

    @Logger() logger!: ILogger;


}
