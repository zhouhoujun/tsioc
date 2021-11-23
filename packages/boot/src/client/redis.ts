import { ILogger, Logger } from '@tsdi/logs';
import { AbstractClient } from './client';


export class RedisClient extends AbstractClient {

    @Logger() logger!: ILogger;


}
