import { ILogger, Logger } from '@tsdi/logs';
import { AbstractClient } from './client';

export class ModbusClient extends AbstractClient {

    @Logger() logger!: ILogger;


}
