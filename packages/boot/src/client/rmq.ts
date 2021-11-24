import { AbstractClient } from './client';


export class RMQClient extends AbstractClient {
    connect(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }


}
