import { ClientRequsetPacket, Endpoint, EndpointContext, Interceptor, isBlob, isFormData, ResponseEvent } from '@tsdi/core';
import { Injectable, isFunction } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { defer, mergeMap, Observable } from 'rxjs';
import { hdr } from '../consts';
import { createFormData, isFormDataLike } from '../utils';


@Injectable({ static: true })
export class DetectBodyInterceptor implements Interceptor<ClientRequsetPacket, ResponseEvent> {

    constructor() { }

    intercept(req: ClientRequsetPacket, next: Endpoint<ClientRequsetPacket, ResponseEvent>, context: EndpointContext): Observable<ResponseEvent> {
        let body = req.serializeBody();
        if (body == null) {
            return next.handle(req, context);
        }
        return defer(async () => {
            const contentType = req.detectContentTypeHeader();
            if (!req.headers.get(hdr.CONTENT_TYPE) && contentType) {
                req.headers.set(hdr.CONTENT_TYPE, contentType);
            }
            if (!req.headers.has(hdr.CONTENT_LENGTH)) {
                if (isBlob(body)) {
                    const arrbuff = await body.arrayBuffer();
                    body = Buffer.from(arrbuff);
                } else if (isFormDataLike(body)) {
                    if (isFormData(body)) {
                        const form = createFormData();
                        body.forEach((v, k, parent) => {
                            form.append(k, v);
                        });
                        body = form;
                    }
                    body = body.getBuffer();
                }
                req.body = body;
                req.headers.set(hdr.CONTENT_LENGTH, Buffer.byteLength(body as Buffer).toString());
            }

            return req;

        }).pipe(
            mergeMap(req => next.handle(req, context))
        );
    }
}

