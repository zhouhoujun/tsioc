import { Injectable } from '@tsdi/ioc';
import { Context, Packet, Sender, AssetTransportOpts, SendPacket } from '@tsdi/common';
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

    send(factory: (pkg: Packet, headDelimiter?: Buffer) => Context, packet: Packet): Observable<any> {

        const ctx = factory(packet, this.headDelimiter);
        return this.encoder.handle(ctx)
            .pipe(
                map(data => {
                    if(ctx.payloadOnly) return data;
                    
                    if ((packet as SendPacket).__headMsg) {
                        if (!data || !data.length) {
                            return data ?? Buffer.alloc(0);
                        }
                        return Buffer.concat([
                            Buffer.from(String(data.length)),
                            this.delimiter,
                            data
                        ])
                    }

                    const bufId = Buffer.alloc(2);
                    bufId.writeUInt16BE(packet.id);

                    return Buffer.concat([
                        Buffer.from(String(data.length + bufId.length)),
                        this.delimiter,
                        bufId,
                        data
                    ])
                }),
                finalize(() => ctx.destroy())
            )
    }

}
