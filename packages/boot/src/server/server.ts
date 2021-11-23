import { Abstract } from '@tsdi/ioc';
import { Disposable, Server } from '@tsdi/core';

@Abstract()
export abstract class AbstractServer implements Server, Disposable {
    connect(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }

    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
