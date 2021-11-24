import { AbstractClient } from './client';


export class WSClient extends AbstractClient {
    connect(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }


}
