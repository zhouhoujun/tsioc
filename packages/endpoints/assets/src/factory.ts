import { Injectable, Injector } from '@tsdi/ioc';
import { Receiver, Sender, TransportFactory, TransportOpts } from '@tsdi/common';
import { AssetReceiver } from './receiver';
import { AssetDecoder } from './decoder';
import { AssetEncoder } from './encoder';
import { AssetSender } from './sender';



@Injectable()
export class AssetTransportFactory implements TransportFactory {

    constructor(readonly injector: Injector, readonly encoder: AssetEncoder, readonly decorder: AssetDecoder) { }

    createReceiver(options?: TransportOpts): Receiver {
        return new AssetReceiver(this.injector, this.decorder, options ?? {})
    }
    createSender(options?: TransportOpts): Sender {
        return new AssetSender(this.injector, this.encoder, options ?? {})
    }

}
