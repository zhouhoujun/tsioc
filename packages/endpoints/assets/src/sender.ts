import { Injectable, Injector } from '@tsdi/ioc';
import { Context, Encoder, Packet, PacketLengthException, Sender, Transport, TransportOpts, hdr } from '@tsdi/common';
import { Observable, finalize, map, throwError } from 'rxjs';
import { AssetEncoder } from './encoder';


@Injectable()
export class AssetSender implements Sender {

    private delimiter: Buffer;
    private maxSize?: number;

    constructor(
        private injector: Injector,
        readonly transport: Transport,
        readonly encoder: AssetEncoder,
        options: TransportOpts
    ) {

        this.delimiter = Buffer.from(options.delimiter ?? '#');
        this.maxSize = options.maxSize;
    }

    send(packet: Packet): Observable<any> {
        const ctx = new Context(this.injector, this.transport, packet);
        const len = ~~(packet.headers?.[hdr.CONTENT_LENGTH] ?? '0');
        if (this.maxSize && len > this.maxSize) return throwError(() => new PacketLengthException(len.toString()))
        return this.encoder.handle(ctx)
            .pipe(
                map(data => {
                    const len = Buffer.byteLength(data);
                    return Buffer.concat([
                        Buffer.from(String(len)),
                        this.delimiter,
                        data
                    ])
                }),
                finalize(() => ctx.destroy())
            )
    }

}
