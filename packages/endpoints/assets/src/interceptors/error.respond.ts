import { Injectable } from '@tsdi/ioc';
import { ENOENT, MessageExecption } from '@tsdi/common';
import { AssetContext } from '@tsdi/endpoints';
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
        context.removeHeaders();

        // then set those specified
        if (err.headers) context.setHeader(err.headers);

        const vaildator = context.vaildator;
        let status = err.status || err.statusCode;
        // ENOENT support
        if (ENOENT === err.code) status = vaildator.notFound;

        // default to serverError
        if (!vaildator.isStatus(status)) status = vaildator.serverError;

        context.status = status;
        // empty response.
        if (vaildator.isEmptyExecption(status)) {
            return res.end();
        }

        // respond
        let msg: any;
        msg = err.message;
        
        // force text/plain
        context.type = 'text';
        msg = Buffer.from(msg ?? context.statusMessage ?? '');
        context.length = Buffer.byteLength(msg);
        res.end(msg)

        return res;

    }

}
