import { Injectable, isNil, isString } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { isArrayBuffer, isBlob, isFormData, isUrlSearchParams, ResponseEvent, RequestParams, AbstractRequest, HeaderAdapter } from '@tsdi/common';
import { IStream, StreamAdapter } from '@tsdi/common/transport';
import { defer, mergeMap, Observable } from 'rxjs';
import { Buffer } from 'buffer';
import { ClientTransportSession } from '../session';


/**
 * request body content interceptor.
 */
@Injectable()
export class BodyContentInterceptor<TRequest extends AbstractRequest<any> = AbstractRequest<any>, TResponse = ResponseEvent<any>> implements Interceptor<TRequest, TResponse> {

    constructor() { }

    intercept(req: TRequest & RequestSerialize, next: Handler<TRequest, TResponse>): Observable<TResponse> {

        const session = req.context.get(ClientTransportSession);
        let body = req.serializeBody ? req.serializeBody(req.body) : this.serializeBody(session.streamAdapter, req.body);
        if (body == null) {
            return next.handle(req);
        }
        return defer(async () => {
            let headers = req.headers;
            const contentType = req.detectContentTypeHeader ? req.detectContentTypeHeader(req.body) : this.detectContentTypeHeader(session.streamAdapter, req.body);
            if (!session.headerAdapter.hasContentType(headers) && contentType) {
                headers = session.headerAdapter.setContentType(headers, contentType);
            }
            if (!session.headerAdapter.hasContentLength(headers)) {
                if (isBlob(body)) {
                    const arrbuff = await body.arrayBuffer();
                    body = Buffer.from(arrbuff);
                } else if (session.streamAdapter.isFormDataLike(body)) {
                    if (isFormData(body)) {
                        const form = session.streamAdapter.createFormData();
                        body.forEach((v, k, parent) => {
                            form.append(k, v);
                        });
                        body = form;
                    }
                    body = (body as any).getBuffer();
                }
                headers = session.headerAdapter.setContentLength(headers, Buffer.byteLength(body as Buffer));
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
    serializeBody(adapter: StreamAdapter, body: any): ArrayBuffer | IStream | Buffer | Blob | FormData | string | null {
        // If no body is present, no need to serialize it.
        if (isNil(body)) {
            return null
        }
        // Check whether the body is already in a serialized form. If so,
        // it can just be returned directly.
        if (isArrayBuffer(body) || Buffer.isBuffer(body) || adapter.isStream(body) || isBlob(body) || adapter.isFormDataLike(body) ||
            isUrlSearchParams(body) || isString(body)) {
            return body as any;
        }

        // Check whether the body is an instance of HttpUrlEncodedParams.
        if (body instanceof RequestParams) {
            return body.toString()
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
    detectContentTypeHeader(adapter: StreamAdapter, body: any): string | null {
        // An empty body has no content type.
        if (body === null) {
            return null
        }
        // FormData bodies rely on the browser's content type assignment.
        if (adapter.isFormDataLike(body)) {
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
        if (body instanceof RequestParams) {
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
