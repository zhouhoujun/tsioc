import { EMPTY_OBJ, Injectable, lang } from '@tsdi/ioc';
import { ResponsePacket, ResponseEventFactory, TransportEvent, StreamAdapter, TransportRequest, toBuffer, isBuffer, hdr, HEAD, ev, ResHeaders, OutgoingHeaders, StatusCode, ResponseJsonParseError } from '@tsdi/common';
import { ResponseTransform } from '@tsdi/common/client';
import { StatusVaildator } from '@tsdi/endpoints';
import { Observable, defer, of } from 'rxjs';
import { Redirector } from '../Redirector';
import { MimeAdapter, MimeTypes } from '../MimeAdapter';
import { XSSI_PREFIX } from '../utils';


@Injectable()
export class AssetResponseTransform implements ResponseTransform {

    constructor(
        private streamAdapter: StreamAdapter,
        private mimeTypes: MimeTypes,
        private mimeAdapter: MimeAdapter,
        private redirector: Redirector
    ) { }

    transform(req: TransportRequest, packet: ResponsePacket<any>, factory: ResponseEventFactory<TransportEvent>): Observable<TransportEvent> {
        if (!packet.headers) {
            packet.headers = {};
        }
        const context = req.context;
        const vaildator = context.get(StatusVaildator);
        if(!packet.status) {
            packet.status = packet.error? vaildator.serverError : vaildator.ok;
        }

        let body = packet.payload ?? null;
        const url = req.url;
        const { headers, status, statusText } = packet;
        let ok = false;
        const streamAdapter = this.streamAdapter;

        if (vaildator.isEmpty(status)) {
            body = null;
            return of(factory.createResponse({
                url,
                headers,
                status,
                body
            }));
        }

        // HTTP fetch step 5

        if (vaildator.isRedirect(status)) {
            // HTTP fetch step 5.2
            return this.redirector.redirect<TransportEvent>(req, status, headers);

        }

        return defer(async () => {

            let error = packet.error;
            let responseType = req.responseType;
            ok = vaildator.isOk(status);

            if (!ok) {
                if (!error) {
                    if (streamAdapter.isReadable(body)) {
                        body = await toBuffer(body);
                    }
                    if (isBuffer(body)) {
                        body = new TextDecoder().decode(body);
                    }
                }
                throw factory.createErrorResponse({
                    url,
                    error: error ?? body,
                    status,
                    statusText
                });
            }

            const rqstatus = req.context.getValueify(RequestStauts, () => new RequestStauts());
            // HTTP-network fetch step 12.1.1.3
            const codings = headers?.[hdr.CONTENT_ENCODING];

            // HTTP-network fetch step 12.1.1.4: handle content codings
            // in following scenarios we ignore compression support
            // 1. compression support is disabled
            // 2. HEAD request
            // 3. no Content-Encoding header
            // 4. no content response (204)
            // 5. content not modified response (304)
            if (rqstatus.compress && req.method !== HEAD && codings) {
                // For Node v6+
                // Be less strict when decoding compressed responses, since sometimes
                // servers send slightly invalid responses that are still accepted
                // by common browsers.
                // Always using Z_SYNC_FLUSH is what cURL does.
                const constants = streamAdapter.getZipConstants();
                const zlibOptions = {
                    flush: constants.Z_SYNC_FLUSH,
                    finishFlush: constants.Z_SYNC_FLUSH
                };

                try {
                    if (codings === 'gzip' || codings === 'x-gzip') { // For gzip
                        const unzip = streamAdapter.createGunzip(zlibOptions);
                        await streamAdapter.pipeTo(body, unzip);
                        body = unzip;
                    } else if (codings === 'deflate' || codings === 'x-deflate') { // For deflate
                        // Handle the infamous raw deflate response from old servers
                        // a hack for old IIS and Apache servers
                        const raw = streamAdapter.createPassThrough();
                        await streamAdapter.pipeTo(body, raw);
                        const defer = lang.defer();
                        raw.on(ev.DATA, chunk => {
                            if ((chunk[0] & 0x0F) === 0x08) {
                                body = streamAdapter.pipeline(body, streamAdapter.createInflate(), err => {
                                    if (err) {
                                        defer.reject(err);
                                    }
                                });
                            } else {
                                body = streamAdapter.pipeline(body, streamAdapter.createInflateRaw(), err => {
                                    if (err) {
                                        defer.reject(err);
                                    }
                                });
                            }
                        });

                        raw.once(ev.END, defer.resolve);

                        await defer.promise;

                    } else if (codings === 'br') { // For br
                        const unBr = streamAdapter.createBrotliDecompress();
                        await streamAdapter.pipeTo(body, unBr);
                        body = unBr;
                    }
                } catch (err) {
                    ok = false;
                    error = err;
                }
            }

            let originalBody: any;
            const contentType = headers[hdr.CONTENT_TYPE] as string;
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
                return factory.createResponse({
                    url,
                    body,
                    headers,
                    ok,
                    status,
                    statusText
                });
            } else {
                throw factory.createErrorResponse({
                    url,
                    error: error ?? body,
                    status,
                    statusText
                });
            }

        });

    }

}

export class RequestStauts {
    public highWaterMark: number;
    public insecureParser: boolean;
    public referrerPolicy: ReferrerPolicy;
    readonly compress: boolean;
    constructor(init: {
        compress?: boolean;
        follow?: number;
        counter?: number;
        highWaterMark?: number;
        insecureParser?: boolean;
        referrerPolicy?: ReferrerPolicy;
        redirect?: 'manual' | 'error' | 'follow' | '';
    } = EMPTY_OBJ) {
        this.compress = init.compress ?? false;
        this.highWaterMark = init.highWaterMark ?? 16384;
        this.insecureParser = init.insecureParser ?? false;
        this.referrerPolicy = init.referrerPolicy ?? '';
    }
}

