import { Injectable, Injector } from '@tsdi/ioc';
import { Receiver, Sender, Transport, TransportFactory, TransportOpts } from '@tsdi/common';
import { JsonReceiver } from './receiver';
import { JsonDecoder } from './decoder';
import { JsonEncoder } from './encoder';
import { JsonSender } from './sender';



@Injectable()
export class JsonTransportFactory implements TransportFactory {

    constructor(readonly injector: Injector, readonly encoder: JsonEncoder, readonly decorder: JsonDecoder) { }

    createReceiver<TSocket>(socket: TSocket, transport: Transport, options?: TransportOpts): Receiver<TSocket> {
        return new JsonReceiver(this.injector, socket, transport, this.decorder, options ?? {})
    }
    createSender<TSocket>(socket: TSocket, transport: Transport, options?: TransportOpts): Sender<TSocket> {
        return new JsonSender(this.injector, socket, transport, this.encoder, options ?? {})
    }

}
