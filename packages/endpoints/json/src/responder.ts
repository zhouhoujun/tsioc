import { Injectable, isNil } from '@tsdi/ioc';
import { MessageExecption, PacketLengthException, RequestPacket, ResponsePacket, StreamAdapter, TransportSession, isBuffer, toBuffer } from '@tsdi/common';
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
            throw new PacketLengthException(`packet length ${len} great than max size ${session.options.maxSize}`);
        }

        if (ctx.get(StreamAdapter).isReadable(res)) {
            ctx.body = toBuffer(res);
        }
        if (isBuffer(res)) {
            ctx.body = new TextDecoder().decode(res);
        }

        await lastValueFrom(session.send(ctx.response));
    }

    async sendExecption(ctx: TransportContext, err: MessageExecption): Promise<any> {
        const session = ctx.get(TransportSession);
        ctx.response.error = {
            name: err.name,
            message: err.message,
            status: err.status ?? err.statusCode
        }
        if (!isNil(err.status)) ctx.response.status = err.status;
        ctx.response.statusText = err.message


        await lastValueFrom(session.send(ctx.response));

    }

}
