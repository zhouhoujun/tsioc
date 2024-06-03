import { HeadersLike, Packet, PacketFactory, Pattern, RequestPacket, RequestPacketOpts, RequestParams } from "@tsdi/common";
import { Injectable } from "@tsdi/ioc";


export class TcpIncoming<T = any> extends RequestPacket<T> {

    constructor(readonly pattern: Pattern, options: RequestPacketOpts<T>) {
        super(options)
    }

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

    toJson(): Record<string, any> {
        const rcd = super.toJson();
        rcd.pattern = this.pattern;
        return rcd;
    }

}

@Injectable()
export class TcpIncomingFactory implements PacketFactory {
    create<T>(packet: RequestPacketOpts<T> & { pattern: Pattern; }): Packet<T> {
        return new TcpIncoming<T>(packet.pattern, packet);
    }

}