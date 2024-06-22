import { Injectable } from '@tsdi/ioc';
import { HeadersLike, Pattern, RequestParams } from '@tsdi/common';
import { ClientIncomingFactory, ClientIncomingOpts, ClientIncomingPacket, ClientPatternIncoming, IncomingFactory, IncomingOpts, PatternIncoming } from '@tsdi/common/transport';



export class RedisIncoming<T = any> extends PatternIncoming<T> {

    clone(): RedisIncoming<T>;
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
    }): RedisIncoming<T>;
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
    }): RedisIncoming<V>;
    clone(update: any = {}): RedisIncoming {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);
        return new RedisIncoming(pattern, opts);

    }

}

@Injectable()
export class RedisIncomingFactory implements IncomingFactory {
    create<T>(packet: IncomingOpts<T> & { pattern: Pattern; }): RedisIncoming<T> {
        return new RedisIncoming<T>(packet.pattern, packet);
    }
}


export class RedisClientIncoming<T = any> extends ClientPatternIncoming<T, null> {

    clone(): ClientIncomingPacket<T, null>;
    clone(update: { headers?: HeadersLike | undefined; body?: T | null | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: number | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): RedisClientIncoming<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; body?: T | null | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: number | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): RedisClientIncoming<V>;
    clone(update: any = {}): RedisClientIncoming {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);
        return new RedisClientIncoming(pattern, opts);
    }
}

@Injectable()
export class RedisClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: ClientIncomingOpts<any, any> & { pattern: Pattern }): RedisClientIncoming<T> {
        return new RedisClientIncoming(options.pattern, options);
    }

}