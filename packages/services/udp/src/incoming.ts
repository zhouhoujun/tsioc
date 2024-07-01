import { HeadersLike, Pattern, RequestParams } from '@tsdi/common';
import { ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, ClientPatternIncoming, IncomingFactory, IncomingOpts, PatternIncoming } from '@tsdi/common/transport';
import { Injectable } from '@tsdi/ioc';
import { RemoteInfo } from 'dgram';


export interface UdpIncomingOpts extends IncomingOpts {
    remoteInfo?: RemoteInfo;
}

export class UdpIncoming<T> extends PatternIncoming<T> {
    readonly remoteInfo: RemoteInfo;
    constructor(pattern: Pattern, options: UdpIncomingOpts) {
        super(pattern, options)
        this.remoteInfo = options.remoteInfo!;
    }

    clone(): UdpIncoming<T>;
    clone<V>(update: {
        pattern?: Pattern;
        remoteInfo?: RemoteInfo;
        headers?: HeadersLike | undefined;
        params?: RequestParams | undefined;
        method?: string | undefined;
        body?: V | null | undefined;
        payload?: V | null | undefined;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        etParams?: { [param: string]: string; } | undefined;
        timeout?: number | null | undefined;
    }): UdpIncoming<V>;
    clone(update: {
        pattern?: Pattern;
        remoteInfo?: RemoteInfo;
        headers?: HeadersLike | undefined;
        params?: RequestParams | undefined;
        method?: string | undefined;
        body?: T;
        payload?: T;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        setParams?: { [param: string]: string; } | undefined;
        timeout?: number | null | undefined;
    }): UdpIncoming<T>;
    clone(update: any = {}): UdpIncoming<any> {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update) as UdpIncomingOpts;
        opts.remoteInfo = this.remoteInfo;
        return new UdpIncoming(pattern, opts);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.remoteInfo = this.remoteInfo;
        return rcd;
    }

}

@Injectable()
export class UdpIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T> & { pattern: Pattern; }): UdpIncoming<T> {
        return new UdpIncoming<T>(packet.pattern, packet);
    }
}

export interface UdpClientIncomingOpts extends ClientIncomingOpts {
    remoteInfo?: RemoteInfo;
}


export class UdpClientIncoming<T> extends ClientPatternIncoming<T, null> {

    readonly remoteInfo: RemoteInfo;
    constructor(pattern: Pattern, options: UdpClientIncomingOpts) {
        super(pattern, options)
        this.remoteInfo = options.remoteInfo!;
    }

    clone(): ClientIncomingPacket<T, null>;
    clone<V>(update: {
        remoteInfo?:RemoteInfo;
        headers?: HeadersLike | undefined;
        body?: T | null | undefined;
        payload?: V | null | undefined;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        type?: number | undefined;
        ok?: boolean | undefined;
        status?: number | undefined;
        statusMessage?: string | undefined;
        statusText?: string | undefined;
        error?: any;
    }): UdpClientIncoming<V>;
    clone(update: {
        remoteInfo?: RemoteInfo;
        headers?: HeadersLike | undefined;
        body?: T | null | undefined;
        payload?: T | null | undefined;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        type?: number | undefined;
        ok?: boolean | undefined;
        status?: number | undefined;
        statusMessage?: string | undefined;
        statusText?: string | undefined;
        error?: any;
    }): UdpClientIncoming<T>;
    clone(update: any = {}): UdpClientIncoming<any> {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update) as UdpClientIncomingOpts;
        opts.remoteInfo = this.remoteInfo;
        return new UdpClientIncoming(pattern, opts);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.remoteInfo = this.remoteInfo;
        return rcd;
    }
}

@Injectable()
export class UdpClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any> & { pattern: Pattern }): UdpClientIncoming<T> {
        return new UdpClientIncoming(options.pattern, options);
    }

}