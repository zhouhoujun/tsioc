import { Injectable } from '@tsdi/ioc';
import {
    IncomingCloneOpts, IncomingFactory, IncomingOpts, IncomingPacket,
    Incoming, OutgoingCloneOpts, OutgoingFactory, OutgoingPacket, OutgoingPacketOpts 
} from '@tsdi/common/transport';



export class TcpIncoming<T> extends IncomingPacket<T> {

    clone(): TcpIncoming<T>;
    clone<V>(update: IncomingCloneOpts<V>): TcpIncoming<V>;
    clone(update: IncomingCloneOpts<T>): TcpIncoming<T>;
    clone(update: IncomingCloneOpts<any> = {}): TcpIncoming<any> {
        const opts = this.cloneOpts(update);
        return new TcpIncoming(opts);

    }

}

@Injectable()
export class TcpIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T>): TcpIncoming<T> {
        return new TcpIncoming<T>(packet);
    }
}



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