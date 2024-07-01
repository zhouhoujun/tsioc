import { Injectable } from '@tsdi/ioc';
import { HeadersLike, Pattern, RequestParams } from '@tsdi/common';
import { ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, ClientPatternIncoming, IncomingFactory, IncomingOpts, PatternIncoming } from '@tsdi/common/transport';



export class WsIncoming<T> extends PatternIncoming<T> {

    clone(): WsIncoming<T>;
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
    }): WsIncoming<V>;
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
    }): WsIncoming<T>;
    clone(update: any = {}): WsIncoming<any> {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);
        return new WsIncoming(pattern, opts);

    }

}

@Injectable()
export class WsIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T> & { pattern: Pattern; }): WsIncoming<T> {
        return new WsIncoming<T>(packet.pattern, packet);
    }
}


export class WsClientIncoming<T> extends ClientPatternIncoming<T, null> {

    clone(): ClientIncomingPacket<T, null>;
    clone(update: { headers?: HeadersLike | undefined; body?: T | null | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: number | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): WsClientIncoming<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; body?: T | null | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: number | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): WsClientIncoming<V>;
    clone(update: any = {}): WsClientIncoming<any> {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);
        return new WsClientIncoming(pattern, opts);
    }
}

@Injectable()
export class WsClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any> & { pattern: Pattern }): WsClientIncoming<T> {
        return new WsClientIncoming(options.pattern, options);
    }

}