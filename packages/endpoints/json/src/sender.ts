import { Injector } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { Context, Packet, PacketLengthException, Sender, Transport, TransportOpts } from '@tsdi/common';
import { Observable, finalize, map, throwError } from 'rxjs';
import { JsonEncoder } from './encoder';



export class JsonSender<TSocket> implements Sender<TSocket> {

    private delimiter: Buffer;
    constructor(
        private injector: Injector,
        readonly socket: TSocket,
        readonly transport: Transport,
        readonly encoder: JsonEncoder,
        private options: TransportOpts
    ) {
        this.delimiter = Buffer.from(this.options.delimiter ?? '#');
    }

    send(packet: Packet): Observable<any> {
        const len = packet.length ?? 0;
        if (this.options.maxSize && len > this.options.maxSize) {
            const btpipe = this.injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(this.options.maxSize)}`));
        }

        const ctx = new Context(this.injector, this.transport, this.options, packet);
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
