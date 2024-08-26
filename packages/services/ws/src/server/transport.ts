import { Injectable } from '@tsdi/ioc';
import { RequestParams } from '@tsdi/common';
import { IncomingCloneOpts, IncomingFactory, IncomingOpts, IncomingPacket, Incoming, OutgoingCloneOpts, OutgoingFactory, OutgoingPacket, OutgoingPacketOpts  } from '@tsdi/common/transport';



export class WsIncoming<T> extends IncomingPacket<T> {

    clone(): WsIncoming<T>;
    clone<V>(update: IncomingCloneOpts<V>): WsIncoming<V>;
    clone(update: IncomingCloneOpts<T>): WsIncoming<T>;
    clone(update: IncomingCloneOpts<any> = {}): WsIncoming<any> {
        const opts = this.cloneOpts(update);
        return new WsIncoming(opts);

    }

}

@Injectable()
export class WsIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T>): WsIncoming<T> {
        return new WsIncoming<T>(packet);
    }
}


export class WsOutgoing<T, TStatus = null> extends OutgoingPacket<T, TStatus> {

    clone(): WsOutgoing<T, TStatus>;
    clone<V>(update: OutgoingCloneOpts<V, TStatus>): WsOutgoing<V, TStatus>;
    clone(update: OutgoingCloneOpts<T, TStatus>): WsOutgoing<T, TStatus>;
    clone(update: any = {}): WsOutgoing<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new WsOutgoing(opts);
    }

}


export class WsOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, null>): WsOutgoing<T> {
        return new WsOutgoing({ id: incoming.id, pattern: incoming.pattern, ...options });
    }

}