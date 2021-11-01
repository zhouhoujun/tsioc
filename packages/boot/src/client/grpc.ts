import { Client, Configure } from '@tsdi/core';

@Configure()
export class CrpcClient implements Client {

    connect(): void | Promise<void> {
        throw new Error('Method not implemented.');
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

}