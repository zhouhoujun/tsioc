import { Injectable } from '@tsdi/ioc';
import { IncomingCloneOpts, IncomingFactory, UrlIncoming, OutgoingCloneOpts, OutgoingFactory, OutgoingPacket, OutgoingPacketOpts } from '@tsdi/common/transport';
import { RemoteInfo } from 'dgram';
import { UdpIncomingOpts } from '../message';


export class UdpIncoming<T> extends UrlIncoming<T> {
    readonly remoteInfo: RemoteInfo;
    constructor(options: UdpIncomingOpts) {
        super(options)
        this.remoteInfo = options.remoteInfo!;
    }

    clone(): UdpIncoming<T>;
    clone<V>(update: {
        remoteInfo?: RemoteInfo;
    } & IncomingCloneOpts<V>): UdpIncoming<V>;
    clone(update: {
        remoteInfo?: RemoteInfo;
    } & IncomingCloneOpts<T>): UdpIncoming<T>;
    clone(update: {
        remoteInfo?: RemoteInfo;
    } & IncomingCloneOpts<any> = {}): UdpIncoming<any> {
        const opts = this.cloneOpts(update) as UdpIncomingOpts;
        opts.remoteInfo = this.remoteInfo;
        return new UdpIncoming(opts);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.remoteInfo = this.remoteInfo;
        return rcd;
    }

}

@Injectable()
export class UdpIncomingFactory implements IncomingFactory {
    create<T>(packet: UdpIncomingOpts): UdpIncoming<T> {
        return new UdpIncoming<T>(packet);
    }
}


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