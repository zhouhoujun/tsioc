import { Injectable, Injector } from '@tsdi/ioc';
import { Context, Packet, Sender } from '@tsdi/common';
import { Observable } from 'rxjs';
import { JsonEncoder } from './encoder';


@Injectable()
export class JsonSender implements Sender {

    constructor(
        private injector: Injector,
        readonly encoder: JsonEncoder
    ) { }

    send(packet: Packet): Observable<any> {
        return this.encoder.handle(new Context(this.injector, packet))
    }

}