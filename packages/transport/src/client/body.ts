import {
    Endpoint, EndpointContext, Interceptor, isArrayBuffer, isBlob, isFormData,
    isUrlSearchParams, Message, TransportEvent, TransportRequest
} from '@tsdi/core';
import { Injectable, isString, _tybool, _tynum, _tyobj } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { Stream } from 'stream';
import { defer, mergeMap, Observable } from 'rxjs';
import { hdr } from '../consts';
import { createFormData, isBuffer, isFormDataLike, isStream } from '../utils';


@Injectable({ static: true })
export class BodyContentInterceptor implements Interceptor<TransportRequest, TransportEvent> {

    constructor() { }

    intercept(req: TransportRequest, next: Endpoint<Message, TransportEvent>, context: EndpointContext): Observable<TransportEvent> {
        let body = this.serializeBody(req.body);
        if (body == null) {
            return next.handle(req, context);
        }
        return defer(async () => {
            const contentType = this.detectContentTypeHeader(body);
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
                    body = (body as any).getBuffer();
                }
                req.body = body;
                req.headers.set(hdr.CONTENT_LENGTH, Buffer.byteLength(body as Buffer).toString());
            }

            return req;

        }).pipe(
            mergeMap(req => next.handle(req, context))
        );
    }

    /**
     * Transform the free-form body into a serialized format suitable for
     * transmission to the server.
     */
    serializeBody(body: any): ArrayBuffer | Stream | Buffer | Blob | FormData | string | null {
        // If no body is present, no need to serialize it.
        if (body === null) {
            return null
        }
        // Check whether the body is already in a serialized form. If so,
        // it can just be returned directly.
        if (isArrayBuffer(body) || isBuffer(body) || isStream(body) || isBlob(body) || isFormDataLike(body) ||
            isUrlSearchParams(body) || isString(body)) {
            return body as any;
        }

        // Check whether the body is an object or array, and serialize with JSON if so.
        if (typeof body === _tyobj || typeof body === _tybool ||
            Array.isArray(body)) {
            return JSON.stringify(body)
        }
        // Fall back on toString() for everything else.
        return (body as any).toString()
    }
    /**
     * Examine the body and attempt to infer an appropriate MIME type
     * for it.
     *
     * If no such type can be inferred, this method will return `null`.
     */
    detectContentTypeHeader(body: any): string | null {
        // An empty body has no content type.
        if (body === null) {
            return null
        }
        // FormData bodies rely on the browser's content type assignment.
        if (isFormDataLike(body)) {
            return null
        }
        // Blobs usually have their own content type. If it doesn't, then
        // no type can be inferred.
        if (isBlob(body)) {
            return body.type || null
        }
        // Array buffers have unknown contents and thus no type can be inferred.
        if (isArrayBuffer(body)) {
            return null
        }
        // Technically, strings could be a form of JSON data, but it's safe enough
        // to assume they're plain strings.
        if (isString(body)) {
            return 'text/plain'
        }
        // `HttpUrlEncodedParams` has its own content-type.
        if (body instanceof URLSearchParams) {
            return 'application/x-www-form-urlencoded;charset=UTF-8'
        }
        // Arrays, objects, boolean and numbers will be encoded as JSON.
        const type = typeof body;
        if (type === _tyobj || type === _tynum ||
            type === _tybool) {
            return 'application/json'
        }
        // No type could be inferred.
        return null
    }
}

