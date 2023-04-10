import { HttpEvent, HttpRequest } from '@tsdi/common';
import { Handler, Interceptor, isBlob, isFormData } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { StreamAdapter, hdr } from '@tsdi/transport';
import { defer, mergeMap, Observable } from 'rxjs';

/**
 * http body interceptor.
 */
@Injectable({ static: true })
export class HttpBodyInterceptor implements Interceptor<HttpRequest, HttpEvent> {

    constructor(private adapter: StreamAdapter) { }

    intercept(req: HttpRequest<any>, next: Handler<HttpRequest<any>, HttpEvent<any>>): Observable<HttpEvent<any>> {
        let body = req.serializeBody();
        if (body == null) {
            return next.handle(req);
        }
        return defer(async () => {
            let headers = req.headers;
            const contentType = req.detectContentTypeHeader();
            if (!headers.has(hdr.CONTENT_TYPE) && contentType) {
                headers = headers.set(hdr.CONTENT_TYPE, contentType);
            }
            if (!headers.has(hdr.CONTENT_LENGTH)) {
                if (isBlob(body)) {
                    const arrbuff = await body.arrayBuffer();
                    body = Buffer.from(arrbuff);
                } else if (this.adapter.isFormDataLike(body)) {
                    if (isFormData(body)) {
                        const form = this.adapter.createFormData();
                        body.forEach((v, k, parent) => {
                            form.append(k, v);
                        });
                        body = form as any;
                    }
                    body = (body as any).getBuffer();
                }
                headers = headers.set(hdr.CONTENT_LENGTH, String(Buffer.byteLength(body as Buffer)));
            }

            return req.clone({
                headers,
                body
            })

        }).pipe(
            mergeMap(req => next.handle(req))
        );
    }
}

