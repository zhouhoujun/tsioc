import { Injectable, Injector } from '@tsdi/ioc';
import { Receiver, Sender, Transport, TransportFactory, TransportOpts } from '@tsdi/common';
import { AssetReceiver } from './receiver';
import { AssetDecoder } from './decoder';
import { AssetEncoder } from './encoder';
import { AssetSender } from './sender';



@Injectable()
export class AssetTransportFactory implements TransportFactory {

    constructor(readonly injector: Injector, readonly encoder: AssetEncoder, readonly decorder: AssetDecoder) { }

    createReceiver(transport: Transport, options?: TransportOpts): Receiver {
        return new AssetReceiver(this.injector, transport, this.decorder, options ?? {})
    }
    createSender(transport: Transport, options?: TransportOpts): Sender {
        return new AssetSender(this.injector, transport, this.encoder, options ?? {})
    }

}
