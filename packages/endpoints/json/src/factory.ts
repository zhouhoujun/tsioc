import { Injectable, Injector } from '@tsdi/ioc';
import { Receiver, Sender, Transport, TransportFactory, TransportOpts } from '@tsdi/common';
import { JsonReceiver } from './receiver';
import { JsonDecoder } from './decoder';
import { JsonEncoder } from './encoder';
import { JsonSender } from './sender';



@Injectable()
export class JsonTransportFactory implements TransportFactory {

    constructor(readonly injector: Injector, readonly encoder: JsonEncoder, readonly decorder: JsonDecoder) { }

    createReceiver(transport: Transport, options?: TransportOpts): Receiver {
        return new JsonReceiver(this.injector, transport, this.decorder, options ?? {})
    }
    createSender(transport: Transport, options?: TransportOpts): Sender {
        return new JsonSender(this.injector, transport, this.encoder, options ?? {})
    }

}
