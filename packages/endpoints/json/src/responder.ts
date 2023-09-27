import { Injectable, isString } from '@tsdi/ioc';
import { InvalidJsonException, MessageExecption, RequestPacket, ResponsePacket, StreamAdapter, TransportSession, isBuffer, toBuffer } from '@tsdi/common';
import { Responder, TransportContext } from '@tsdi/endpoints';
import { lastValueFrom } from 'rxjs';


@Injectable()
export class JsonResponder implements Responder {

    constructor() {

    }

    async send(ctx: TransportContext, res: any): Promise<any> {
        const session = ctx.get(TransportSession);

        if (ctx.get(StreamAdapter).isReadable(res)) {
            res = toBuffer(res);
        }
        if (isBuffer(res)) {
            res = new TextDecoder().decode(res);
        }
        
        const { url, topic, id, replyTo } = ctx.request as RequestPacket;
        const pkg = {
            id,
            payload: res,
        } as ResponsePacket;

        if (replyTo ?? topic) {
            pkg.topic = replyTo ?? topic;
        } else if (url) {
            pkg.url = url;
        }
        ctx.response = pkg;

        await lastValueFrom(session.send(res));
    }

    async sendExecption(ctx: TransportContext, err: MessageExecption): Promise<any> {
        const session = ctx.get(TransportSession);
        const { url, topic, id, replyTo } = ctx.request as RequestPacket;
        const pkg = {
            id,
            error: err,
            status: err.status,
            statusText: err.message
        } as ResponsePacket;

        if (replyTo ?? topic) {
            pkg.topic = replyTo ?? topic;
        } else if (url) {
            pkg.url = url;
        }
        ctx.response = pkg;


        await lastValueFrom(session.send(pkg));

    }

}
