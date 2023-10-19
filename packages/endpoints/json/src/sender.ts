import { Injector } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { Context, Packet, PacketLengthException, Sender, Transport } from '@tsdi/common';
import { Observable, finalize, map, throwError } from 'rxjs';
import { JsonEncoder } from './encoder';



export class JsonSender implements Sender {

    private delimiter: Buffer;
    constructor(
        private injector: Injector,
        readonly transport: Transport,
        readonly encoder: JsonEncoder,
        delimiter: string,
        private maxSize: number
    ) {
        this.delimiter = Buffer.from(delimiter);
    }

    send(packet: Packet): Observable<any> {
        const len = packet.length ?? 0;
        if (len > this.maxSize) {
            const btpipe = this.injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(this.maxSize)}`));
        }

        const ctx = new Context(this.injector, this.transport, packet);
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
