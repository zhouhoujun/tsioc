import { AbstractClient } from './client';


export class TCPClient extends AbstractClient {
    connect(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }


}
