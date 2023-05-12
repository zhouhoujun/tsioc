import {
    Handler, Interceptor, isArrayBuffer, isBlob, isFormData,
    isUrlSearchParams, IStream, TransportEvent, TransportRequest
} from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { defer, mergeMap, Observable } from 'rxjs';
import { Buffer } from 'buffer';
import { hdr } from '../consts';
import { isBuffer } from '../utils';
import { StreamAdapter, FormData } from '../stream';


/**
 * body content interceptor.
 */
@Injectable({ static: true })
export class BodyContentInterceptor<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> implements Interceptor<TRequest, TResponse> {

    constructor( private adapter: StreamAdapter) { }

    intercept(req: TRequest & RequestSerialize, next: Handler<TRequest, TResponse>): Observable<TResponse> {
        let body = req.serializeBody ? req.serializeBody(req.body) : this.serializeBody(req.body);
        if (body == null) {
            return next.handle(req);
        }
        return defer(async () => {
            let headers = req.headers;
            const contentType = req.detectContentTypeHeader ? req.detectContentTypeHeader(body) : this.detectContentTypeHeader(body);
            if (!headers.get(hdr.CONTENT_TYPE) && contentType) {
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
                        body = form;
                    }
                    body = (body as any).getBuffer();
                }
                headers = headers.set(hdr.CONTENT_LENGTH, Buffer.byteLength(body as Buffer));
            }

            return req.clone({ body, headers }) as TRequest;

        }).pipe(
            mergeMap(req => next.handle(req))
        );
    }

    /**
     * Transform the free-form body into a serialized format suitable for
     * transmission to the server.
     */
    serializeBody(body: any): ArrayBuffer | IStream | Buffer | Blob | FormData | string | null {
        // If no body is present, no need to serialize it.
        if (body === null) {
            return null
        }
        // Check whether the body is already in a serialized form. If so,
        // it can just be returned directly.
        if (isArrayBuffer(body) || isBuffer(body) || this.adapter.isStream(body) || isBlob(body) || this.adapter.isFormDataLike(body) ||
            isUrlSearchParams(body) || isString(body)) {
            return body as any;
        }

        // Check whether the body is an object or array, and serialize with JSON if so.
        if (typeof body === 'object' || typeof body === 'boolean' ||
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
        if (this.adapter.isFormDataLike(body)) {
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
        if (type === 'object' || type === 'number' ||
            type === 'boolean') {
            return 'application/json'
        }
        // No type could be inferred.
        return null
    }
}

/**
 * Request Serialize.
 */
export interface RequestSerialize {
    /**
     * Transform the free-form body into a serialized format suitable for
     * transmission to the server.
     */
    serializeBody(body: any): ArrayBuffer | IStream | Buffer | Blob | FormData | string | null;
    /**
     * Examine the body and attempt to infer an appropriate MIME type
     * for it.
     *
     * If no such type can be inferred, this method will return `null`.
     */
    detectContentTypeHeader(body: any): string | null;
}
