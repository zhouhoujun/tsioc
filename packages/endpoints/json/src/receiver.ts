import { Injectable } from '@tsdi/ioc';
import { Packet, Receiver } from '@tsdi/common';
import { Observable } from 'rxjs';
import { JsonDecoder } from './decoder';

@Injectable()
export class JsonReceiver implements Receiver {

    constructor(readonly decoder: JsonDecoder) {

    }

    receive(input: Buffer): void {
        
    }

    get packet(): Observable<Packet<any>> {
        throw new Error('Method not implemented.');
    }

}