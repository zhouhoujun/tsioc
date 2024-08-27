import { Injectable } from '@tsdi/ioc';
import { UrlClientIncomingCloneOpts, ClientIncomingFactory, UrlClientIncoming, UrlClientIncomingOpts } from '@tsdi/common/transport';


export class WsClientIncoming<T, TStatus = null> extends UrlClientIncoming<T, TStatus> {

    clone(): WsClientIncoming<T, TStatus>;
    clone<V>(update: UrlClientIncomingCloneOpts<V, TStatus>): WsClientIncoming<V, TStatus>;
    clone(update: UrlClientIncomingCloneOpts<T, TStatus>): WsClientIncoming<T, TStatus>;
    clone(update: UrlClientIncomingCloneOpts<any, TStatus> = {}): WsClientIncoming<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new WsClientIncoming(opts);
    }
}

@Injectable()
export class WsClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: UrlClientIncomingOpts<any, any>): WsClientIncoming<T> {
        return new WsClientIncoming(options);
    }

}