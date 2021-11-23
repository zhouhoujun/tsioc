import { ILogger, Logger } from '@tsdi/logs';
import { AbstractClient } from './client';


export class GrpcClient extends AbstractClient {
    
    @Logger() logger!: ILogger;


}
