import {
    ENOENT, ExecptionContext, ExecptionFilter, InternalServerError, TransportError,
} from '@tsdi/core';
import { Injectable, isNumber } from '@tsdi/ioc';
import { PacketProtocol } from '../packet';
import { TcpContext } from './context';


@Injectable({ static: true })
export class TcpFinalizeFilter implements ExecptionFilter {

    async handle(ctx: ExecptionContext, next: () => Promise<void>): Promise<any> {
        if (ctx.completed || !ctx.execption) return;
        let err: any;
        try {
            await next();
            if (ctx.completed) return;
            err = ctx.execption as TransportError
        } catch (er) {
            err = new InternalServerError((er as Error).message)
        }

        //finllay defalt send error.

        const hctx = ctx.get(TcpContext);
        let headerSent = false;
        if (hctx.sent) {
            headerSent = err.headerSent = true
        }

        // nothing we can do here other
        // than delegate to the app-level
        // handler and log.
        if (headerSent) {
            return
        }

        const res = hctx.response;

        // first unset all headers
        for (const n in res.getHeaders()) {
            res.removeHeader(n);
        }


        // then set those specified
        if (err.headers) hctx.setHeader(err.headers);

        // force text/plain
        hctx.type = 'text';
        let statusCode = (err.status || err.statusCode) as number;
        let msg: string;
        if (err instanceof TransportError) {
            msg = err.message
        } else {
            // ENOENT support
            if (ENOENT === err.code) statusCode = hctx.transport.status.notFound;

            // default to server error.
            if (!isNumber(statusCode) || !hctx.transport.status.message(statusCode)) statusCode = hctx.transport.status.serverError;

            // respond
            msg = hctx.transport.status.message(statusCode);
        }
        hctx.status = statusCode;
        hctx.statusMessage = msg;
        // hctx.length = Buffer.byteLength(msg);

        ctx.get(PacketProtocol).write(res.socket, res.serializePacket());
        // const encoder = ctx.get(Encoder);
        // const { delimiter, encoding } = ctx.get(TcpServerOptions);
        // await writeSocket(res.socket, res.id, 0, encoder.encode(res.serializeHeader()), delimiter!,encoding);
    }

}


