import { ClientReqPacket, Endpoint, EndpointContext, Interceptor, isBlob, isFormData, ResponseEvent } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { defer, mergeMap, Observable } from 'rxjs';
import * as NodeFormData from 'form-data';
import { hdr } from '../consts';


@Injectable()
export class TcpBodyInterceptor implements Interceptor<ClientReqPacket, ResponseEvent> {

    constructor() { }

    intercept(req: ClientReqPacket, next: Endpoint<ClientReqPacket, ResponseEvent>, context: EndpointContext): Observable<ResponseEvent> {
        let body = req.serializeBody();
        if (body == null) {
            return next.handle(req, context);
        }
        return defer(async () => {
            const contentType = req.detectContentTypeHeader();
            if (!req.hasHeader(hdr.CONTENT_TYPE) && contentType) {
                req.setHeader(hdr.CONTENT_TYPE, contentType);
            }
            if (!req.hasHeader(hdr.CONTENT_LENGTH)) {
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
                req.body = body;
                req.setHeader(hdr.CONTENT_LENGTH, Buffer.byteLength(body as Buffer).toString());
            }

            return req;

        }).pipe(
            mergeMap(req => next.handle(req, context))
        );
    }
}

