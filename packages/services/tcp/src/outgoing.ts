import { HeadersLike } from '@tsdi/common';
import { Incoming, OutgoingFactory, OutgoingPacketOpts, PatternOutgoing } from '@tsdi/common/transport';


export class TcpOutgoing<T> extends PatternOutgoing<T> {

    clone(): TcpOutgoing<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): TcpOutgoing<V>;
    clone(update: { headers?: HeadersLike | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): TcpOutgoing<T>;
    clone(update: any = {}): TcpOutgoing<any> {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);

        return new TcpOutgoing(pattern, opts);
    }
}


export class TcpOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, null>): TcpOutgoing<T> {
        return new TcpOutgoing(incoming.pattern!, { id: incoming.id, ...options });
    }

}