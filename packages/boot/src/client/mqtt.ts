import { AbstractClient } from './client';
import { ILogger, Logger } from '@tsdi/logs';


export class MQTTClient extends AbstractClient {

    @Logger() logger!: ILogger;


}
