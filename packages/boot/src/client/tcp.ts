import { ILogger, Logger } from '@tsdi/logs';
import { AbstractClient } from './client';


export class TCPClient extends AbstractClient {

    @Logger() logger!: ILogger;

}
