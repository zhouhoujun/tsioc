import { Injectable, Injector } from '@tsdi/ioc';
import { Context, Packet, Sender } from '@tsdi/common';
import { Observable, map } from 'rxjs';
import { JsonEncoder } from './encoder';


@Injectable()
export class JsonSender implements Sender {

    private delimiter: Buffer;
    constructor(
        private injector: Injector,
        readonly encoder: JsonEncoder,
        delimiter: string
    ) {
        this.delimiter = Buffer.from(delimiter);
    }

    send(packet: Packet): Observable<any> {
        return this.encoder.handle(new Context(this.injector, packet))
            .pipe(
                map(data => {
                    const len = Buffer.byteLength(data);
                    return Buffer.concat([
                        Buffer.from(String(len)),
                        this.delimiter,
                        data
                    ])
                })
            )
    }

}