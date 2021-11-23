import { ILogger, Logger } from '@tsdi/logs';
import { AbstractServer } from './server';

export class GrpcServer extends AbstractServer {

    @Logger() logger!: ILogger;
    
}
