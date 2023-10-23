import { Context, Packet, Sender, TransportOpts } from '@tsdi/common';
import { Observable, finalize, map } from 'rxjs';
import { JsonEncoder } from './encoder';



export class JsonSender implements Sender {

    private delimiter: Buffer;
    constructor(
        readonly encoder: JsonEncoder,
        options: TransportOpts
    ) {
        this.delimiter = Buffer.from(options.delimiter ?? '#');
    }

    send(factory: (pkg: Packet, headDelimiter?: Buffer) => Context, packet: Packet): Observable<any> {

        const ctx = factory(packet);
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
