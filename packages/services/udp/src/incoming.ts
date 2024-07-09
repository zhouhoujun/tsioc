import { ClientIncomingCloneOpts, ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, IncomingCloneOpts, IncomingFactory, IncomingOpts, IncomingPacket } from '@tsdi/common/transport';
import { Injectable } from '@tsdi/ioc';
import { RemoteInfo } from 'dgram';


export interface UdpIncomingOpts extends IncomingOpts {
    remoteInfo?: RemoteInfo;
}

export class UdpIncoming<T> extends IncomingPacket<T> {
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
    create<T>(packet: IncomingOpts<T>): UdpIncoming<T> {
        return new UdpIncoming<T>(packet);
    }
}

export interface UdpClientIncomingOpts extends ClientIncomingOpts {
    remoteInfo?: RemoteInfo;
}


export class UdpClientIncoming<T, TStatus = null> extends ClientIncomingPacket<T, TStatus> {

    readonly remoteInfo: RemoteInfo;
    constructor(options: UdpClientIncomingOpts) {
        super(options)
        this.remoteInfo = options.remoteInfo!;
    }

    clone(): UdpClientIncoming<T, TStatus>;
    clone<V>(update: {
        remoteInfo?: RemoteInfo;
    } & ClientIncomingCloneOpts<V, TStatus>): UdpClientIncoming<V, TStatus>;
    clone(update: {
        remoteInfo?: RemoteInfo;
    } & ClientIncomingCloneOpts<T, TStatus>): UdpClientIncoming<T, TStatus>;
    clone(update: {
        remoteInfo?: RemoteInfo;
    } & ClientIncomingCloneOpts<any, TStatus> = {}): UdpClientIncoming<any, TStatus> {
        const opts = this.cloneOpts(update) as UdpClientIncomingOpts;
        opts.remoteInfo = this.remoteInfo;
        return new UdpClientIncoming(opts);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.remoteInfo = this.remoteInfo;
        return rcd;
    }
}

@Injectable()
export class UdpClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any>): UdpClientIncoming<T> {
        return new UdpClientIncoming(options);
    }

}