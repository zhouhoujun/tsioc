import { Abstract } from '@tsdi/ioc';
import { ApplicationContext, Server } from '@tsdi/core';

@Abstract()
export abstract class AbstractServer implements Server {
    connect(ctx: ApplicationContext): void | Promise<void> {
        throw new Error('Method not implemented.');
    }

    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    

}
