import { mths, ExecptionRespondTypeAdapter, TransportError } from '@tsdi/core';
import { Injectable, isString, lang } from '@tsdi/ioc';
import { Readable } from 'stream';
import { hdr, ev } from '../../consts';
import { isBuffer, isStream } from '../../utils';
import { HttpContext, HttpServResponse } from './context';
import { RespondAdapter } from '../../interceptors/respond';

@Injectable()
export class HttpRespondAdapter implements RespondAdapter {

    async respond(res: HttpServResponse, ctx: HttpContext): Promise<any> {
        if (ctx.destroyed) return;

        if (!ctx.writable) return;

        let body = ctx.body;
        const code = ctx.status;

        // ignore body
        if (ctx.adapter.isEmpty(code)) {
            // strip headers
            ctx.body = null;
            return res.end()
        }

        if (mths.HEAD === ctx.method) {
            if (!res.headersSent && !res.hasHeader(hdr.CONTENT_LENGTH)) {
                const length = ctx.length;
                if (Number.isInteger(length)) ctx.length = length
            }
            return res.end()
        }

        // status body
        if (null == body) {
            if (ctx._explicitNullBody) {
                res.removeHeader(hdr.CONTENT_TYPE);
                res.removeHeader(hdr.CONTENT_LENGTH);
                res.removeHeader(hdr.TRANSFER_ENCODING);
                return res.end()
            }
            if (ctx.request.httpVersionMajor >= 2) {
                body = String(code);
            } else {
                body = ctx.statusMessage || String(code)
            }
            body = Buffer.from(body)
            if (!res.headersSent) {
                ctx.type = 'text';
                ctx.length = Buffer.byteLength(body)
            }
            return res.end(body)
        }

        // responses
        if (isBuffer(body)) return res.end(body);
        if (isString(body)) return res.end(Buffer.from(body));
        if (isStream(body)) {
            const defer = lang.defer();
            body.once(ev.ERROR, (err) => {
                defer.reject(err)
            });
            body.once(ev.END, () => {
                defer.resolve()
            });
            body.pipe(res);
            return await defer.promise
                .then(() => {
                    res.end();
                    body instanceof Readable && body.destroy();
                })
        }

        // body: json
        body = Buffer.from(JSON.stringify(body));
        if (!res.headersSent) {
            ctx.length = Buffer.byteLength(body)
        }
        res.end(body);
        return res
    }

}


@Injectable()
export class HttpExecptionRespondTypeAdapter extends ExecptionRespondTypeAdapter {
    respond<T>(ctx: HttpContext, response: 'body' | 'header' | 'response', value: T): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            ctx.setHeader(value as Record<string, any>);
        } else if (response === 'response') {
            if (value instanceof TransportError) {
                ctx.status = value.statusCode;
                ctx.statusMessage = value.message
            } else {
                ctx.status = 500;
                ctx.statusMessage = String(value)
            }
        }
    }
}
