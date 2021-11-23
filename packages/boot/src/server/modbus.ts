import { ILogger, Logger } from '@tsdi/logs';
import { AbstractServer } from './server';

export class ModbusServer extends AbstractServer {

    @Logger() logger!: ILogger;
    
}
