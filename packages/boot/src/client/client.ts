import { Abstract } from '@tsdi/ioc';
import { Client, Disposable } from '@tsdi/core';

@Abstract()
export abstract class AbstractClient implements Client, Disposable {

    connect(): void | Promise<void> {
        
    }
    close(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }
    send<TO = any, TI = any>(pattern: any, data: TI): TO {
        throw new Error('Method not implemented.');
    }
    emit<TO = any, TI = any>(pattern: any, data: TI): TO {
        throw new Error('Method not implemented.');
    }

    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}