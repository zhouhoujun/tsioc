import { MessageExecption, ENOENT, AssetContext } from '@tsdi/core';
import { Injectable, isFunction, isNumber } from '@tsdi/ioc';
import { Buffer } from 'buffer';


@Injectable({ static: true })
export class ErrorRespondAdapter<TCtx extends AssetContext = AssetContext> {

    respond(context: TCtx, err: MessageExecption): any {

        //finllay defalt send error.
        let headerSent = false;
        if (context.sent || !context.response.writable) {
            headerSent = err.headerSent = true
        }

        // nothing we can do here other
        // than delegate to the app-level
        // handler and log.
        if (headerSent) {
            return
        }

        const res = context.response;

        // first unset all headers
        if (isFunction(res.getHeaderNames)) {
            res.getHeaderNames().forEach((name: string) => res.removeHeader(name))
        } else {
            (res as any)._headers = {} // Node < 7.7
        }

        // then set those specified
        if (err.headers) context.setHeader(err.headers);

        const vaildator = context.vaildator;
        // force text/plain
        context.type = 'text';
        let status = err.status || err.statusCode;
        let msg;
        // ENOENT support
        if (ENOENT === err.code) status = vaildator.notFound;

        // default to serverError
        if (!vaildator.isStatus(status)) status = vaildator.serverError;
        // respond
        msg = err.message;

        context.status = status;
        msg = Buffer.from(msg ?? context.statusMessage ?? '');
        context.length = Buffer.byteLength(msg);
        res.end(msg)

        return res;

    }

}
