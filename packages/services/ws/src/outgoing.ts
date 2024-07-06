import { Incoming, OutgoingCloneOpts, OutgoingFactory, OutgoingPacket, OutgoingPacketOpts } from '@tsdi/common/transport';


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