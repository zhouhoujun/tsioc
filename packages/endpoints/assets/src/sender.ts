import { Injectable } from '@tsdi/ioc';
import { Context, Packet, Sender, AssetTransportOpts } from '@tsdi/common';
import { Observable, finalize, map } from 'rxjs';
import { AssetEncoder } from './encoder';


@Injectable()
export class AssetSender implements Sender {

    private delimiter: Buffer;
    private headDelimiter: Buffer;

    constructor(
        readonly encoder: AssetEncoder,
        options: AssetTransportOpts
    ) {

        this.delimiter = Buffer.from(options.delimiter ?? '#');
        this.headDelimiter = Buffer.from(options.headDelimiter ?? '$');
    }

    send(contextFactory: (pkg: Packet, headDelimiter?: Buffer) => Context, packet: Packet): Observable<any> {

        const ctx = contextFactory(packet, this.headDelimiter);
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
