import { Injectable } from '@tsdi/ioc';
import { TransportHandler } from '../handler';
import { TransportServer } from '../server';

@Injectable()
export class MQTTServer extends TransportServer {

    constructor(){
        
    }

    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
