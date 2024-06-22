import { HeadersLike } from '@tsdi/common';
import { Incoming, OutgoingFactory, PatternOutgoing, OutgoingPacketOpts } from '@tsdi/common/transport';


export class RedisOutgoing<T = any> extends PatternOutgoing<T> {

    clone(): RedisOutgoing<T>;
    clone(update: { headers?: HeadersLike | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): RedisOutgoing<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): RedisOutgoing<V>;
    clone(update: any = {}): RedisOutgoing {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);

        return new RedisOutgoing(pattern, opts);
    }

}


export class RedisOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, null>): RedisOutgoing<T> {
        return new RedisOutgoing(incoming.pattern!, { id: incoming.id, ...options });
    }

}