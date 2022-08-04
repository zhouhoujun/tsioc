import { ClientRequsetPacket, IncomingHeaders, isArrayBuffer, isBlob, isUrlSearchParams, mths, Packet, ReqHeaders, ReqHeadersLike } from '@tsdi/core';
import { isString, type_bool, type_num, type_obj } from '@tsdi/ioc';
import { Stream } from 'stream';
import { isBuffer, isStream, isFormDataLike } from '../utils';

/**
 * Client Request.
 */
export class TransportRequest<T = any> implements ClientRequsetPacket<T> {

    public url: string;
    public method: string;
    public params: IncomingHeaders;
    public body: T | null;
    readonly headers: ReqHeaders;

    constructor(option: {
        url: string;
        headers?: ReqHeadersLike;
        params?: IncomingHeaders;
        method?: string;
        body?: T;
    }) {
        this.url = option.url;
        this.method = option.method ?? mths.MESSAGE;
        this.params = option.params ?? {};
        this.body = option.body ?? null;
        this.headers = new ReqHeaders(option.headers);
    }

    /**
     * Transform the free-form body into a serialized format suitable for
     * transmission to the server.
     */
    serializeBody(): ArrayBuffer | Stream | Buffer | Blob | FormData | string | null {
        // If no body is present, no need to serialize it.
        if (this.body === null) {
            return null
        }
        // Check whether the body is already in a serialized form. If so,
        // it can just be returned directly.
        if (isArrayBuffer(this.body) || isBuffer(this.body) || isStream(this.body) || isBlob(this.body) || isFormDataLike(this.body) ||
            isUrlSearchParams(this.body) || isString(this.body)) {
            return this.body as any;
        }

        // Check whether the body is an object or array, and serialize with JSON if so.
        if (typeof this.body === type_obj || typeof this.body === type_bool ||
            Array.isArray(this.body)) {
            return JSON.stringify(this.body)
        }
        // Fall back on toString() for everything else.
        return (this.body as any).toString()
    }

    /**
     * Examine the body and attempt to infer an appropriate MIME type
     * for it.
     *
     * If no such type can be inferred, this method will return `null`.
     */
    detectContentTypeHeader(): string | null {
        // An empty body has no content type.
        if (this.body === null) {
            return null
        }
        // FormData bodies rely on the browser's content type assignment.
        if (isFormDataLike(this.body)) {
            return null
        }
        // Blobs usually have their own content type. If it doesn't, then
        // no type can be inferred.
        if (isBlob(this.body)) {
            return this.body.type || null
        }
        // Array buffers have unknown contents and thus no type can be inferred.
        if (isArrayBuffer(this.body)) {
            return null
        }
        // Technically, strings could be a form of JSON data, but it's safe enough
        // to assume they're plain strings.
        if (isString(this.body)) {
            return 'text/plain'
        }
        // `HttpUrlEncodedParams` has its own content-type.
        if (this.body instanceof URLSearchParams) {
            return 'application/x-www-form-urlencoded;charset=UTF-8'
        }
        // Arrays, objects, boolean and numbers will be encoded as JSON.
        const type = typeof this.body;
        if (type === type_obj || type === type_num ||
            type === type_bool) {
            return 'application/json'
        }
        // No type could be inferred.
        return null
    }

}
