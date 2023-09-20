import { Injectable, Injector  } from '@tsdi/ioc';
import { Packet, Sender } from '@tsdi/common';
import { Observable } from 'rxjs';
import { JsonEncoder } from './encoder';
import { JsonContext } from './context';


@Injectable()
export class JsonSender implements Sender {

    constructor(
        private injector: Injector,
        readonly encoder: JsonEncoder) {}
    
    send(packet: Packet): Observable<any> {
        return this.encoder.handle(new JsonContext(this.injector, packet, null!))
    }
    
}