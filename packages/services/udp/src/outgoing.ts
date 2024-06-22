import { HeadersLike } from '@tsdi/common';
import { Incoming, OutgoingFactory, PatternOutgoing, OutgoingPacketOpts } from '@tsdi/common/transport';


export class UdpOutgoing<T = any> extends PatternOutgoing<T> {

    clone(): UdpOutgoing<T>;
    clone(update: { headers?: HeadersLike | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): UdpOutgoing<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): UdpOutgoing<V>;
    clone(update: any = {}): UdpOutgoing {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);

        return new UdpOutgoing(pattern, opts);
    }

}


export class UdpOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, null>): UdpOutgoing<T> {
        return new UdpOutgoing(incoming.pattern!, { id: incoming.id, ...options });
    }

}