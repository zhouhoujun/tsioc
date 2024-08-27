import { Injectable } from '@tsdi/ioc';
import { UrlIncomingCloneOpts, IncomingFactory, UrlIncomingOptions, UrlIncoming, Incoming, OutgoingCloneOpts, OutgoingFactory, AbstractOutgoing, OutgoingOpts  } from '@tsdi/common/transport';



export class WsIncoming<T> extends UrlIncoming<T> {

    clone(): WsIncoming<T>;
    clone<V>(update: UrlIncomingCloneOpts<V>): WsIncoming<V>;
    clone(update: UrlIncomingCloneOpts<T>): WsIncoming<T>;
    clone(update: UrlIncomingCloneOpts<any> = {}): WsIncoming<any> {
        const opts = this.cloneOpts(update);
        return new WsIncoming(opts);

    }

}

@Injectable()
export class WsIncomingFactory implements IncomingFactory {
    create<T>(packet: UrlIncomingOptions<T>): WsIncoming<T> {
        return new WsIncoming<T>(packet);
    }
}


export class WsOutgoing<T, TStatus = null> extends AbstractOutgoing<T, TStatus> {

    clone(): WsOutgoing<T, TStatus>;
    clone<V>(update: OutgoingCloneOpts<V, TStatus>): WsOutgoing<V, TStatus>;
    clone(update: OutgoingCloneOpts<T, TStatus>): WsOutgoing<T, TStatus>;
    clone(update: any = {}): WsOutgoing<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new WsOutgoing(opts);
    }

}


export class WsOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingOpts<T, null>): WsOutgoing<T> {
        return new WsOutgoing({ id: incoming.id, pattern: incoming.pattern, ...options });
    }

}