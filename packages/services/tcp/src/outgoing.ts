import { HeadersLike, Pattern } from '@tsdi/common';
import { Incoming, OutgoingFactory, OutgoingPacket, OutgoingPacketOpts } from '@tsdi/common/transport';


export class TcpOutgoing<T = any> extends OutgoingPacket<T, null> {

    constructor(readonly pattern: Pattern, options: OutgoingPacketOpts<T, null>) {
        super(options);
    }

    clone(): TcpOutgoing<T>;
    clone(update: { headers?: HeadersLike | undefined; payload?: T | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): TcpOutgoing<T>;
    clone<V>(update: { headers?: HeadersLike | undefined; payload?: V | null | undefined; setHeaders?: { [name: string]: string | string[]; } | undefined; type?: number | undefined; ok?: boolean | undefined; status?: null | undefined; statusMessage?: string | undefined; statusText?: string | undefined; error?: any; }): TcpOutgoing<V>;
    clone(update: any = {}): TcpOutgoing {
        const pattern = update.pattern ?? this.pattern;
        const opts = this.cloneOpts(update);

        return new TcpOutgoing(pattern, opts);
    }

    toJson(): Record<string, any> {
        const rcd = super.toJson();
        rcd.pattern = this.pattern;
        return rcd;
    }
}


export class TcpOutgoingFactory implements OutgoingFactory {
    create<T>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, null>): TcpOutgoing<T> {
        return new TcpOutgoing(incoming.pattern!, { id: incoming.id, ...options });
    }


}