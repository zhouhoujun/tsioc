import { Abstract } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { OnDispose } from '../../lifecycle';
import { Server } from '../../server';


@Abstract()
export abstract class AbstractServer implements Server, OnDispose {

    @Logger() protected logger!: ILogger;
    
    abstract startup(): Promise<void>

    abstract onDispose(): Promise<void>


}