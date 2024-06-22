import { Injectable } from '@tsdi/ioc';
import { HeadersLike, Pattern, RequestParams } from '@tsdi/common';
import { ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, ClientPatternIncoming, IncomingFactory, IncomingOpts, PatternIncoming } from '@tsdi/common/transport';



export class UdpIncoming<T = any> extends PatternIncoming<T> {

    clone(): UdpIncoming<T>;
    clone(update: {
        pattern?: Pattern;
        headers?: HeadersLike | undefined;
        params?: RequestParams | undefined;
        method?: string | undefined;
        body?: T;
        payload?: T;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        setParams?: { [param: string]: string; } | undefined;
        timeout?: number | null | undefined;
    }): UdpIncoming<T>;
    clone<V>(update: {
        pattern?: Pattern;
        headers?: HeadersLike | undefined;
        params?: RequestParams | undefined;
        method?: string | undefined;
        body?: V | null | undefined;
        payload?: V | null | undefined;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        etParams?: { [param: string]: string; } | undefined;
        timeout?: number | null | undefined;
    }): UdpIncoming<V>;
    clone(update: any = {}): UdpIncoming {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);
        return new UdpIncoming(pattern, opts);

    }

}

@Injectable()
export class UdpIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T> & { pattern: Pattern; }): UdpIncoming<T> {
        return new UdpIncoming<T>(packet.pattern, packet);
    }
}


export class UdpClientIncoming<T = any> extends ClientPatternIncoming<T, null> {

    clone(): ClientIncomingPacket<T, null>;
    clone(update: { headers?: HeadersLike | undefined; body?: T | null | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: number | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): UdpClientIncoming<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; body?: T | null | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: number | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): UdpClientIncoming<V>;
    clone(update: any = {}): UdpClientIncoming {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);
        return new UdpClientIncoming(pattern, opts);
    }
}

@Injectable()
export class UdpClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any> & { pattern: Pattern }): UdpClientIncoming<T> {
        return new UdpClientIncoming(options.pattern, options);
    }

}