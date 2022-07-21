import { ClientReqPacket, IncommingHeaders, isArrayBuffer, isBlob, isFormData, isUrlSearchParams, mths, ReqHeaders, RequestPacket } from '@tsdi/core';
import { isString, type_bool, type_num, type_obj } from '@tsdi/ioc';
import { isBuffer, isStream } from '../../utils';
import { Stream } from 'stream';

/**
 * TcpRequest.
 */
export class TcpRequest<T = any> extends ReqHeaders implements ClientReqPacket<T> {

    public readonly id: string;
    public url: string;
    public method: string;
    public params: IncommingHeaders;
    public body: T | null;

    constructor(id: string, option: {
        url: string;
        params?: IncommingHeaders;
        method?: string;
        body?: T;
    }) {
        super();
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? mths.MESSAGE;
        this.params = option.params ?? {};
        this.body = option.body ?? null;
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
        if (isArrayBuffer(this.body) || isBuffer(this.body) || isStream(this.body) || isBlob(this.body) || isFormData(this.body) ||
            isUrlSearchParams(this.body) || isString(this.body)) {
            return this.body
        }

        // Check whether the body is an object or array, and serialize with JSON if so.
        if (typeof this.body === type_obj || typeof this.body === type_bool ||
            Array.isArray(this.body)) {
            return JSON.stringify(this.body)
        }
        // Fall back on toString() for everything else.
        return (this.body as any).toString()
    }

    serializePacket(): RequestPacket {
        return { id: this.id, url: this.url, method: this.method, params: this.params, headers: this.getHeaders(), body: this.serializeBody() };
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
        if (isFormData(this.body)) {
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
