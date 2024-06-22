import { HeadersLike } from '@tsdi/common';
import { Incoming, OutgoingFactory, PatternOutgoing, OutgoingPacketOpts } from '@tsdi/common/transport';


export class WsOutgoing<T = any> extends PatternOutgoing<T> {

    clone(): WsOutgoing<T>;
    clone(update: { headers?: HeadersLike | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): WsOutgoing<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): WsOutgoing<V>;
    clone(update: any = {}): WsOutgoing {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);

        return new WsOutgoing(pattern, opts);
    }

}


export class WsOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, null>): WsOutgoing<T> {
        return new WsOutgoing(incoming.pattern!, { id: incoming.id, ...options });
    }

}