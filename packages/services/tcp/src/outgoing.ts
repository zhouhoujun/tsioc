import { Incoming, OutgoingCloneOpts, OutgoingFactory, OutgoingPacket, OutgoingPacketOpts } from '@tsdi/common/transport';


export class TcpOutgoing<T, TStatus = null> extends OutgoingPacket<T, TStatus> {

    clone(): TcpOutgoing<T, TStatus>;
    clone<V>(update: OutgoingCloneOpts<V, TStatus>): TcpOutgoing<V, TStatus>;
    clone(update: OutgoingCloneOpts<T, TStatus>): TcpOutgoing<T, TStatus>;
    clone(update: OutgoingCloneOpts<any, TStatus> = {}): TcpOutgoing<any, TStatus> {

        const opts = this.cloneOpts(update);

        return new TcpOutgoing(opts);
    }
}


export class TcpOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, any>): TcpOutgoing<T> {
        return new TcpOutgoing({ id: incoming.id, pattern: incoming.pattern, ...options });
    }

}