import { OutgoingCloneOpts, OutgoingFactory, OutgoingPacket, OutgoingPacketOpts } from '@tsdi/common/transport';
import { RemoteInfo } from 'dgram';
import { UdpIncoming } from './incoming';


export interface UdpOutgoinOpts<T = any, TStatus = any> extends OutgoingPacketOpts<T, TStatus> {
    remoteInfo?: RemoteInfo;

}

export class UdpOutgoing<T, TStatus = null> extends OutgoingPacket<T, TStatus> {
    readonly remoteInfo: RemoteInfo;
    constructor(options: UdpOutgoinOpts<T, TStatus>) {
        super(options)
        this.remoteInfo = options.remoteInfo!;
    }

    clone(): UdpOutgoing<T, TStatus>;
    clone<V>(update: {
        remoteInfo?: RemoteInfo;
    } & OutgoingCloneOpts<V, TStatus>): UdpOutgoing<V, TStatus>;
    clone(update: {
        remoteInfo?: RemoteInfo;
    } & OutgoingCloneOpts<T, TStatus>): UdpOutgoing<T, TStatus>;
    clone(update: {
        remoteInfo?: RemoteInfo;
    } & OutgoingCloneOpts<any, TStatus> = {}): UdpOutgoing<any, TStatus> {
        const opts = this.cloneOpts(update) as UdpOutgoinOpts;
        opts.remoteInfo = this.remoteInfo;
        return new UdpOutgoing(opts);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.remoteInfo = this.remoteInfo;
        return rcd;
    }

}


export class UdpOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: UdpIncoming<any>, options?: OutgoingPacketOpts<T, null>): UdpOutgoing<T> {
        return new UdpOutgoing({ id: incoming.id, pattern: incoming.pattern, remoteInfo: incoming.remoteInfo, ...options });
    }

}