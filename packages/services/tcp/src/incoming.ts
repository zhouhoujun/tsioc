import { Injectable } from '@tsdi/ioc';
import { HeadersLike, Pattern, RequestParams } from '@tsdi/common';
import { ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, ClientPatternIncoming, IncomingFactory, IncomingOpts, PatternIncoming } from '@tsdi/common/transport';



export class TcpIncoming<T = any> extends PatternIncoming<T> {

    clone(): TcpIncoming<T>;
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
    }): TcpIncoming<T>;
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
    }): TcpIncoming<V>;
    clone(update: any = {}): TcpIncoming {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);
        return new TcpIncoming(pattern, opts);

    }

}

@Injectable()
export class TcpIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T> & { pattern: Pattern; }): TcpIncoming<T> {
        return new TcpIncoming<T>(packet.pattern, packet);
    }
}


export class TcpClientIncoming<T = any> extends ClientPatternIncoming<T, null> {

    clone(): ClientIncomingPacket<T, null>;
    clone(update: { headers?: HeadersLike | undefined; body?: T | null | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: number | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): TcpClientIncoming<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; body?: T | null | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: number | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): TcpClientIncoming<V>;
    clone(update: any = {}): TcpClientIncoming {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);
        return new TcpClientIncoming(pattern, opts);
    }
}

@Injectable()
export class TcpClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any> & { pattern: Pattern }): TcpClientIncoming<T> {
        return new TcpClientIncoming(options.pattern, options);
    }

}