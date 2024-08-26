import { ClientIncomingCloneOpts, ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket } from '@tsdi/common/transport';
import { Injectable } from '@tsdi/ioc';
import { RemoteInfo } from 'dgram';


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