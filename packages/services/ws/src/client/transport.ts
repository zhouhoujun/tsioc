import { Injectable } from '@tsdi/ioc';
import { RequestParams } from '@tsdi/common';
import { ClientIncomingCloneOpts, ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket } from '@tsdi/common/transport';


export class WsClientIncoming<T, TStatus = null> extends ClientIncomingPacket<T, TStatus> {

    clone(): WsClientIncoming<T, TStatus>;
    clone<V>(update: ClientIncomingCloneOpts<V, TStatus>): WsClientIncoming<V, TStatus>;
    clone(update: ClientIncomingCloneOpts<T, TStatus>): WsClientIncoming<T, TStatus>;
    clone(update: ClientIncomingCloneOpts<any, TStatus> = {}): WsClientIncoming<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new WsClientIncoming(opts);
    }
}

@Injectable()
export class WsClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any>): WsClientIncoming<T> {
        return new WsClientIncoming(options);
    }

}