import { HeadersLike } from '@tsdi/common';
import { Incoming, OutgoingFactory, OutgoingPacket, OutgoingPacketOpts } from '@tsdi/common/transport';


export class RedisOutgoing<T = any> extends OutgoingPacket<T> {

    clone(): RedisOutgoing<T>;
    clone(update: { headers?: HeadersLike | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): RedisOutgoing<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): RedisOutgoing<V>;
    clone(update: any = {}): RedisOutgoing {
        const init = this.cloneOpts(update);
        return new RedisOutgoing(init);
    }

}


export class RedisOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, null>): RedisOutgoing<T> {
        return new RedisOutgoing({ id: incoming.id, pattern: incoming.pattern,...options });
    }

}