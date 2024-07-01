import { HeadersLike, Pattern } from '@tsdi/common';
import { OutgoingFactory, OutgoingPacketOpts, PatternOutgoing } from '@tsdi/common/transport';
import { RemoteInfo } from 'dgram';
import { UdpIncoming } from './incoming';


export interface UdpOutgoinOpts<T = any, TStatus = any> extends OutgoingPacketOpts<T, TStatus> {
    remoteInfo?: RemoteInfo;

}

export class UdpOutgoing<T> extends PatternOutgoing<T> {
    readonly remoteInfo: RemoteInfo;
    constructor(pattern: Pattern, options: UdpOutgoinOpts<T>) {
        super(pattern, options)
        this.remoteInfo = options.remoteInfo!;
    }

    clone(): UdpOutgoing<T>;
    clone<V>(update: {
        remoteInfo?:RemoteInfo;
        headers?: HeadersLike | undefined;
        payload?: V | null | undefined;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        type?: number | undefined;
        ok?: boolean | undefined;
        status?: null | undefined;
        statusMessage?: string | undefined;
        statusText?: string | undefined;
        error?: any;
    }): UdpOutgoing<V>;
    clone(update: {
        headers?: HeadersLike | undefined;
        payload?: T | null | undefined;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        type?: number | undefined;
        ok?: boolean | undefined;
        status?: null | undefined;
        statusMessage?: string | undefined;
        statusText?: string | undefined;
        error?: any;
    }): UdpOutgoing<T>;
    clone(update: any = {}): UdpOutgoing<any> {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update) as UdpOutgoinOpts;
        opts.remoteInfo = this.remoteInfo;
        return new UdpOutgoing(pattern, opts);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.remoteInfo = this.remoteInfo;
        return rcd;
    }

}


export class UdpOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: UdpIncoming<any>, options?: OutgoingPacketOpts<T, null>): UdpOutgoing<T> {
        return new UdpOutgoing(incoming.pattern!, { id: incoming.id, remoteInfo: incoming.remoteInfo, ...options });
    }

}