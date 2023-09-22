import { Injector } from '@tsdi/ioc';
import { Context, Packet, PacketLengthException, Sender } from '@tsdi/common';
import { Observable, map, throwError } from 'rxjs';
import { JsonEncoder } from './encoder';



export class JsonSender implements Sender {

    private delimiter: Buffer;
    constructor(
        private injector: Injector,
        readonly encoder: JsonEncoder,
        delimiter: string,
        private maxSize: number
    ) {
        this.delimiter = Buffer.from(delimiter);
    }

    send(packet: Packet): Observable<any> {
        return this.encoder.handle(new Context(this.injector, packet))
            .pipe(
                map(data => {
                    const len = Buffer.byteLength(data);
                    if (len > this.maxSize) return throwError(() => new PacketLengthException(len.toString()))
                    return Buffer.concat([
                        Buffer.from(String(len)),
                        this.delimiter,
                        data
                    ])
                })
            )
    }

}
