import { Abstract } from '@tsdi/ioc';
import { Disposable, Server } from '@tsdi/core';
import { ILogger, Logger } from '@tsdi/logs';

@Abstract()
export abstract class AbstractServer extends Server implements Disposable {

    @Logger() protected logger!: ILogger;
    
    startup(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }

    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
