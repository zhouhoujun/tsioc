import { CloneOpts, Pattern } from '@tsdi/common';
import { Incoming, OutgoingFactory, OutgoingPacketOpts, PatternOutgoing } from '@tsdi/common/transport';


export class TcpOutgoing<T = any, TStatus= null> extends PatternOutgoing<T, TStatus> {

    protected createInstance(initOpts: OutgoingPacketOpts<any, any>, update: CloneOpts<T> & { pattern?: Pattern | undefined; }): TcpOutgoing<any, TStatus> {
        return new TcpOutgoing(update.pattern ?? this.pattern, initOpts)
    }
}


export class TcpOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, null>): TcpOutgoing<T> {
        return new TcpOutgoing(incoming.pattern!, { id: incoming.id, ...options });
    }

}