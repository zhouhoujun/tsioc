import { ILogger, Logger } from '@tsdi/logs';
import { AbstractClient } from './client';


export class WSClient extends AbstractClient {

    @Logger() logger!: ILogger;

}
