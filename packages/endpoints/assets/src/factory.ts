import { Injectable } from '@tsdi/ioc';
import { Receiver, Sender, TransportFactory, TransportOpts } from '@tsdi/common';
import { AssetReceiver } from './receiver';
import { AssetDecoder } from './decoder';
import { AssetEncoder } from './encoder';
import { AssetSender } from './sender';



@Injectable()
export class AssetTransportFactory implements TransportFactory {

    constructor(readonly encoder: AssetEncoder, readonly decorder: AssetDecoder) { }

    createReceiver(options: TransportOpts): Receiver {
        return new AssetReceiver(this.decorder, options)
    }
    createSender(options: TransportOpts): Sender {
        return new AssetSender(this.encoder, options)
    }

}
