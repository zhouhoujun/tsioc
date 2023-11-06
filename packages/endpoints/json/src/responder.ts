import { Injectable, isNil } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { PacketLengthException, TransportSession, isBuffer, toBuffer } from '@tsdi/common';
import { Responder, TransportContext } from '@tsdi/endpoints';
import { lastValueFrom } from 'rxjs';


@Injectable()
export class JsonResponder implements Responder {

    constructor() {

    }

    async send(ctx: TransportContext, res: any): Promise<any> {
        res = res ?? ctx.body;
        if (isNil(res)) return;

        const session = ctx.get(TransportSession);

        const len = ctx.length ?? 0;
        if (session.options.maxSize && len > session.options.maxSize) {
            const btpipe = ctx.get<PipeTransform>('bytes-format');
            throw new PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(session.options.maxSize)}`);
        }

        if (ctx.streamAdapter.isReadable(res)) {
            ctx.body = new TextDecoder().decode(await toBuffer(res));
        } else if (isBuffer(res)) {
            ctx.body = new TextDecoder().decode(res);
        }

        await lastValueFrom(session.send(ctx.response));
    }

}
