import { Abstract } from '@tsdi/ioc';
import { Disposable, Server } from '@tsdi/core';
import { ILogger, Logger } from '@tsdi/logs';

@Abstract()
export abstract class AbstractServer implements Server, Disposable {

    @Logger() protected logger!: ILogger;
    
    abstract startup(): void | Promise<void>;

    abstract dispose(): Promise<void>;

}
