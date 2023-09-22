import { Injectable, Injector } from '@tsdi/ioc';
import { Receiver, Sender, TransportFactory, TransportOpts } from '@tsdi/common';
import { JsonReceiver } from './receiver';
import { JsonDecoder } from './decoder';
import { JsonEncoder } from './encoder';
import { JsonSender } from './sender';



@Injectable()
export class JsonTransportFactory implements TransportFactory {

    constructor(readonly injector: Injector, readonly encoder: JsonEncoder, readonly decorder: JsonDecoder) { }

    createReceiver(options?: TransportOpts): Receiver {
        return new JsonReceiver(this.injector, this.decorder, options?.delimiter ?? '#', options?.maxSize ?? 1024 * 256)
    }
    createSender(options?: TransportOpts): Sender {
        return new JsonSender(this.injector, this.encoder, options?.delimiter ?? '#', options?.maxSize ?? 1024 * 256)
    }

}
