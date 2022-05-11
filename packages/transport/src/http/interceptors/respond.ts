import { Endpoint, Interceptor } from '@tsdi/core';
import { isString, lang } from '@tsdi/ioc';
import { mergeMap, Observable } from 'rxjs';
import { Readable } from 'stream';
import { hdr, ev } from '../../consts';
import { isBuffer, isStream } from '../../utils';
import { HttpContext, HttpServRequest, HttpServResponse } from '../context';
import { emptyStatus } from '../status';


export class ResponsedInterceptor implements Interceptor<HttpServRequest, HttpServResponse> {
    intercept(req: HttpServRequest, next: Endpoint<HttpServRequest, HttpServResponse>, ctx: HttpContext): Observable<HttpServResponse> {
        return next.handle(req, ctx)
            .pipe(
                mergeMap(res => {
                    return this.respond(res, ctx)
                })
            )

    }

    protected async respond(res: HttpServResponse, ctx: HttpContext): Promise<any> {
        if (ctx.destroyed) return;

        if (!ctx.writable) return;

        let body = ctx.body;
        const code = ctx.status;

        // ignore body
        if (emptyStatus[code]) {
            // strip headers
            ctx.body = null;
            return res.end();
        }

        if ('HEAD' === ctx.method) {
            if (!res.headersSent && !res.hasHeader(hdr.CONTENT_LENGTH)) {
                const length = ctx.length;
                if (Number.isInteger(length)) ctx.length = length;
            }
            return res.end();
        }

        // status body
        if (null == body) {
            if (ctx._explicitNullBody) {
                res.removeHeader(hdr.CONTENT_TYPE);
                res.removeHeader(hdr.TRANSFER_ENCODING);
                return res.end();
            }
            if (ctx.request.httpVersionMajor >= 2) {
                body = String(code);
            } else {
                body = ctx.statusMessage || String(code);
            }
            if (!res.headersSent) {
                ctx.type = 'text';
                ctx.length = Buffer.byteLength(body);
            }
            return res.end(body);
        }

        // responses
        if (isBuffer(body)) return res.end(body);
        if (isString(body)) return res.end(body);
        if (isStream(body)) {
            let defer = lang.defer();
            body.once(ev.ERROR, (err) => {
                defer.reject(err);
            });
            body.once(ev.END, () => {
                defer.resolve();
            });
            body.pipe(res as any);
            return await defer.promise
                .then(() => {
                    res.end();
                    if (body instanceof Readable) body.destroy();
                });
        }

        // body: json
        body = JSON.stringify(body);
        if (!res.headersSent) {
            ctx.length = Buffer.byteLength(body);
        }
        res.end(body);
        return res;
    }

}