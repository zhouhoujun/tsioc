import { Backend, PacketCoding, ResponseJsonParseError, TransportEvent, TransportRequest } from '@tsdi/core';
import { Injectable, Nullable } from '@tsdi/ioc';
import { Observable, catchError, mergeMap, of } from 'rxjs';
import { StreamAdapter } from '../stream';
import { RequestAdapter } from './request';
import { hdr } from '../consts';
import { StatusVaildator } from '../status';
import { XSSI_PREFIX, isBuffer, toBuffer } from '../utils';
import { MimeAdapter, MimeTypes } from '../mime';


/**
 * transport client endpoint backend.
 */
@Injectable()
export class TransportBackend<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> implements Backend<TRequest, TResponse>  {

    constructor(
        private mimeTypes: MimeTypes,
        private mimeAdapter: MimeAdapter,
        private vaildator: StatusVaildator<TStatus>,
        private reqAdapter: RequestAdapter<TRequest, TResponse, TStatus>,
        @Nullable() private coding: PacketCoding,
        private streamAdapter: StreamAdapter) { }

    handle(req: TRequest): Observable<TResponse> {
        const url = req.url.trim();
        return this.reqAdapter.send(req, this.coding)
            .pipe(
                mergeMap(async incoming => {
                    incoming = this.coding ? this.coding.decode(incoming) : incoming;
                    const headers = this.reqAdapter.parseHeaders(incoming);
                    let { body, status, statusText } = this.reqAdapter.parsePacket(incoming, headers);
                    let originalBody = body;
                    status = status ?? 0 as TStatus;
                    statusText = statusText ?? ''
                    if (this.vaildator.isEmpty(status)) {
                        body = null;
                        return this.reqAdapter.createResponse({
                            url,
                            headers,
                            status,
                            statusText,
                            body
                        });
                    }
                    let error: any;
                    let ok = this.vaildator.isOk(status);

                    let type = req.responseType;
                    const contentType = headers.get(hdr.CONTENT_TYPE) as string;
                    if (contentType) {
                        const adapter = this.mimeAdapter;
                        const mity = this.mimeTypes;
                        if (type === 'json' && !adapter.match(mity.json, contentType)) {
                            if (adapter.match(mity.xml, contentType) || adapter.match(mity.text, contentType)) {
                                type = 'text';
                            } else {
                                type = 'blob';
                            }
                        }
                    }
                    body = type !== 'stream' && this.streamAdapter.isReadable(body) ? await toBuffer(body) : body;

                    switch (type) {
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
                        return this.reqAdapter.createResponse({
                            url,
                            body,
                            headers,
                            status,
                            statusText
                        });
                    } else {
                        throw this.reqAdapter.createErrorResponse({
                            url,
                            error: error ?? body,
                            status,
                            statusText
                        });
                    }
                })
            )

    }

}

