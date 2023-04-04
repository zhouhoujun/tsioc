import { EmptyStatus, GuardHandler, Filter, mths } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { hdr, isBuffer, isStream, pipeStream } from '@tsdi/transport';
import { mergeMap, Observable } from 'rxjs';
import { HttpContext, HttpServResponse } from './context';

@Injectable({ static: true })
export class HttpFinalizeFilter extends Filter {

    intercept(input: any, next: GuardHandler<any, any>, context: HttpContext): Observable<any> {
        return next.handle(input, context)
            .pipe(
                mergeMap(res => {
                    return this.respond(res, context)
                })
            )
    }

    protected async respond(res: HttpServResponse, ctx: HttpContext): Promise<any> {
        if (ctx.destroyed) return;

        if (!ctx.writable) return;

        let body = ctx.body;
        const status = ctx.status;

        // ignore body
        if (status instanceof EmptyStatus) {
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
                body = String(status.status)
            } else {
                body = status.statusText || String(status.status)
            }
            body = Buffer.from(body);
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
            await pipeStream(body, res);
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
