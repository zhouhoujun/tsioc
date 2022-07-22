import { HttpEvent, HttpRequest } from '@tsdi/common';
import { Endpoint, EndpointContext, Interceptor, isBlob, isFormData } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { defer, mergeMap, Observable } from 'rxjs';
import * as NodeFormData from 'form-data';
import { hdr } from '../../consts';


@Injectable()
export class HttpBodyInterceptor implements Interceptor<HttpRequest, HttpEvent> {

    constructor() { }

    intercept(req: HttpRequest<any>, next: Endpoint<HttpRequest<any>, HttpEvent<any>>, context: EndpointContext): Observable<HttpEvent<any>> {
        let body = req.serializeBody();
        if (body == null) {
            return next.handle(req, context);
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
                } else if (isFormData(body)) {
                    let form: NodeFormData;
                    if (body instanceof NodeFormData) {
                        form = body;
                    } else {
                        form = new NodeFormData();
                        body.forEach((v, k, parent) => {
                            form.append(k, v);
                        });
                    }
                    body = form.getBuffer();
                }
                headers = headers.set(hdr.CONTENT_LENGTH, String(Buffer.byteLength(body as Buffer)));
            }

            return req.clone({
                headers,
                body
            })

        }).pipe(
            mergeMap(req => next.handle(req, context))
        );
    }
}

