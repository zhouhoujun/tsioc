import { TransportEvent, TransportRequest, ResHeaders, Redirector, ResponseJsonParseError,
     Encoder, Decoder, IncomingHeaders, OutgoingHeaders, StatusVaildator, StreamAdapter } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { MimeAdapter, MimeTypes } from '../mime';
import { hdr } from '../consts';
import { XSSI_PREFIX, isBuffer, toBuffer } from '../utils';


/**
 * Packet with status
 */
export interface StatusPacket<TStatus> {
    id?: any;
    url?: string;
    topic?: string;
    method?: string;
    type?: number;
    headers?: IncomingHeaders | OutgoingHeaders;
    error?: any;
    status?: TStatus,
    statusText?: string;
    body?: any;
    payload?: any;
}

/**
 * request adapter.
 */
@Abstract()
export abstract class RequestAdapter<TRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> {

    abstract get mimeTypes(): MimeTypes;
    abstract get mimeAdapter(): MimeAdapter;
    abstract get vaildator(): StatusVaildator<TStatus>;
    abstract get streamAdapter(): StreamAdapter;
    abstract get encoder(): Encoder | null;
    abstract get decoder(): Decoder | null;
    abstract get redirector(): Redirector<TStatus> | null;

    /**
     * create error response.
     * @param options 
     */
    abstract createErrorResponse(options: {
        url?: string,
        headers?: ResHeaders;
        status: TStatus;
        error?: any;
        statusText?: string;
        statusMessage?: string;
    }): TResponse;

    /**
     * create header response.
     * @param options 
     */
    abstract createHeadResponse(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeaders;
        status: TStatus;
        statusText?: string;
        statusMessage?: string;
    }): TResponse;

    /**
     * create response.
     * @param options 
     */
    abstract createResponse(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeaders;
        status: TStatus;
        statusText?: string;
        statusMessage?: string;
        body?: any;
    }): TResponse;

    /**
     * parse headers of incoming message.
     * @param incoming 
     */
    abstract parseHeaders(incoming: any): ResHeaders;

    /**
     * parse packet via incoming message.
     * @param incoming 
     * @param headers 
     */
    abstract parsePacket(incoming: any, headers: ResHeaders): StatusPacket<TStatus>;

    /**
     * send request.
     * @param request 
     * @param req 
     * @param callback 
     */
    abstract send(req: TRequest): Observable<TResponse>;

    protected async parseResponse(url: string, body: any, headers: ResHeaders, status: TStatus, statusText: string | undefined, responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream'): Promise<[boolean, TResponse]> {
        let originalBody: any;
        let ok = this.vaildator.isOk(status);
        let error;
        const contentType = headers.get(hdr.CONTENT_TYPE) as string;
        if (contentType) {
            if (responseType === 'json' && !this.mimeAdapter.match(this.mimeTypes.json, contentType)) {
                if (this.mimeAdapter.match(this.mimeTypes.xml, contentType) || this.mimeAdapter.match(this.mimeTypes.text, contentType)) {
                    responseType = 'text';
                } else {
                    responseType = 'blob';
                }
            }
        }
        body = responseType !== 'stream' && this.streamAdapter.isReadable(body) ? await toBuffer(body) : body;
        body = this.decoder ? this.decoder.decode(body) : body;
        switch (responseType) {
            case 'json':
                // Save the original body, before attempting XSSI prefix stripping.
                if (isBuffer(body)) {
                    body = new TextDecoder().decode(body);
                }
                originalBody = body;
                try {
                    body = body.replace(XSSI_PREFIX, '');
                    // Attempt the parse. If it fails, a parse error should be delivered to the user.
                    body = body !== '' ? JSON.parse(body) : null
                } catch (err) {
                    // Since the JSON.parse failed, it's reasonable to assume this might not have been a
                    // JSON response. Restore the original body (including any XSSI prefix) to deliver
                    // a better error response.
                    body = originalBody;

                    // If this was an error request to begin with, leave it as a string, it probably
                    // just isn't JSON. Otherwise, deliver the parsing error to the user.
                    if (ok) {
                        // Even though the response status was 2xx, this is still an error.
                        ok = false;
                        // The parse error contains the text of the body that failed to parse.
                        error = { error: err, text: body } as ResponseJsonParseError
                    }
                }
                break;

            case 'arraybuffer':
                body = body.subarray(body.byteOffset, body.byteOffset + body.byteLength);
                break;
            case 'blob':
                body = new Blob([body.subarray(body.byteOffset, body.byteOffset + body.byteLength)], {
                    type: headers.get(hdr.CONTENT_TYPE) as string
                });
                break;
            case 'stream':
                body = this.streamAdapter.isStream(body) ? body : this.streamAdapter.jsonSreamify(body);
                break;
            case 'text':
            default:
                body = new TextDecoder().decode(body);
                break;
        }


        if (ok) {
            return [ok, this.createResponse({
                url,
                body,
                headers,
                ok,
                status,
                statusText
            })];
        } else {
            return [ok, this.createErrorResponse({
                url,
                error: error ?? body,
                status,
                statusText
            })];
        }
    }
}

