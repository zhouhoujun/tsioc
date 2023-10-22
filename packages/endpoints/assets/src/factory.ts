import { Injectable, Injector } from '@tsdi/ioc';
import { Receiver, Sender, Transport, TransportFactory, TransportOpts } from '@tsdi/common';
import { AssetReceiver } from './receiver';
import { AssetDecoder } from './decoder';
import { AssetEncoder } from './encoder';
import { AssetSender } from './sender';



@Injectable()
export class AssetTransportFactory implements TransportFactory {

    constructor(readonly injector: Injector, readonly encoder: AssetEncoder, readonly decorder: AssetDecoder) { }

    createReceiver<TSocket>(socket: TSocket, transport: Transport, options?: TransportOpts): Receiver<TSocket> {
        return new AssetReceiver(this.injector, socket, transport, this.decorder, options ?? {})
    }
    createSender<TSocket>(socket: TSocket, transport: Transport, options?: TransportOpts): Sender<TSocket> {
        return new AssetSender(this.injector, socket, transport, this.encoder, options ?? {})
    }

}
