import { Injector } from '@tsdi/ioc';
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
        const ctx = new Context(this.injector, this.transport, packet);
        return this.encoder.handle(ctx)
            .pipe(
                map(data => {
                    const len = Buffer.byteLength(data);
                    if (len > this.maxSize) return throwError(() => new PacketLengthException(len.toString()))
                    return Buffer.concat([
                        Buffer.from(String(len)),
                        this.delimiter,
                        data
                    ])
                }),
                finalize(()=> ctx.destroy())
            )
    }

}
