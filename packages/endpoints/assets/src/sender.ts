import { Injectable, Injector } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { Context, Packet, PacketLengthException, Sender, Transport, TransportOpts, hdr } from '@tsdi/common';
import { Observable, finalize, map, throwError } from 'rxjs';
import { AssetEncoder } from './encoder';


@Injectable()
export class AssetSender implements Sender {

    private delimiter: Buffer;
    private maxSize?: number;
    private payloadMaxSize?: number;

    constructor(
        private injector: Injector,
        readonly transport: Transport,
        readonly encoder: AssetEncoder,
        options: TransportOpts
    ) {

        this.delimiter = Buffer.from(options.delimiter ?? '#');
        this.maxSize = options.maxSize;
        this.payloadMaxSize = options.payloadMaxSize;
    }

    send(packet: Packet): Observable<any> {
        const ctx = new Context(this.injector, this.transport, packet);
        const len = ~~(packet.headers?.[hdr.CONTENT_LENGTH] ?? '0');
        if (this.payloadMaxSize && len > this.payloadMaxSize) {
            const btpipe = this.injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Payload length ${btpipe.transform(len)} great than max size ${btpipe.transform(this.payloadMaxSize)}`));
        }

        return this.encoder.handle(ctx)
            .pipe(
                map(data => {
                    return Buffer.concat([
                        Buffer.from(String(data.length)),
                        this.delimiter,
                        data
                    ])
                }),
                finalize(() => ctx.destroy())
            )
    }

}
