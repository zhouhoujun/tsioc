import { ContextToken, isNil, isString, lang } from '@tsdi/ioc';
import { Events, HEAD, HeaderAdapter, MimeAdapter, RequestInterceptorFn, ResponseFactory, ResponseJsonParseError, StatusAdapter, StreamAdapter, XSSI_PREFIX } from '@tsdi/common';
import { TEXT_DECODER } from '@tsdi/transport';
import { Buffer } from 'buffer';
import { defer, map, mergeMap } from 'rxjs';




export const errorResponseInterceptor: RequestInterceptorFn = (req, next, context) => {
    return next(req, context).pipe(
        mergeMap(res => {
            if (!res) return res;
            const statusAdapter = context.get(StatusAdapter);
            if (!(res.ok || (statusAdapter?.isOk(res.status ?? res.statusCode) ?? true)) || res.error) {

                res.ok = false;
                return defer(async () => {
                    let body = res.body;
                    const streamAdapter = context.get(StreamAdapter);
                    if (streamAdapter.isReadable(body)) {
                        body = await streamAdapter.read(body);
                    }
                    if (Buffer.isBuffer(body)) {
                        body = context.get(TEXT_DECODER).decode(body);
                    }
                    res.body = body;
                    if (!res.statusText && !res.statusMessage) res.statusText = body;
                    return context.get(ResponseFactory).create(res);
                })
            }
        })
    )
}


export const emptyResponseInterceptor: RequestInterceptorFn = (input, next, context) => {

    return next(input, context)
        .pipe(
            map(res => {
                const headerAdapter = context.get(HeaderAdapter);
                const statusAdapter = context.get(StatusAdapter);
                const len = headerAdapter.getContentLength(input);
                if (input.ok !== false && !input.error && (!len || statusAdapter?.isEmpty(input.status ?? input.statusCode))) {
                    input.body = null;
                    return context.get(ResponseFactory).create(input);
                }
                return res;
            })
        );
}


// export const redirectInterceptor: RequestInterceptorFn<ClientIncoming<any>, ResponseEvent<any>, RequestContext> = (input: ClientIncoming<any>, next: RequestHandlerFn<ClientIncoming<any>, ResponseEvent<any>, RequestContext>, context: RequestContext) => {
//     const transport = context.get(ClientTransport);
//     // HTTP fetch step 5
//     if (transport.redirector) {
//         if (transport.statusAdapter?.isRedirect(input.status ?? input.statusCode)) {
//             // HTTP fetch step 5.2
//             return transport.redirector.redirect<ResponseEvent<any>>(context.get(AbstractRequest)!, input.status ?? input.statusCode, transport.headerAdapter.getHeaders(input) ?? input.headers!, transport.protocol);
//         }
//     }
//     return next(input, context);
// }

export const compressResponseInterceptor: RequestInterceptorFn = (req, next, context) => {
    return next(req, context).pipe(
        mergeMap(async (response) => {
            const headerAdapter = context.get(HeaderAdapter);
            const streamAdapter = context.get(StreamAdapter);
            const codings = headerAdapter.getContentEncoding(response);
            const rqstatus = context.get(REQUEST_STAUTS);
            // HTTP-network fetch step 12.1.1.4: handle content codings
            // in following scenarios we ignore compression support
            // 1. compression support is disabled
            // 2. HEAD request
            // 3. no Content-Encoding header
            // 4. no content response (204)
            // 5. content not modified response (304)
            if (rqstatus.compress && req.method !== HEAD && codings) {

                let body = response.body;
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
                        raw.on(Events.DATA, chunk => {
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

                        raw.once(Events.END, defer.resolve);

                        await defer.promise;

                    } else if (codings === 'br') { // For br
                        const unBr = streamAdapter.createBrotliDecompress();
                        await streamAdapter.pipeTo(body, unBr);
                        body = unBr;
                    }
                    response.body = body;
                    return response

                } catch (err) {
                    response.error = err;
                    return context.get(ResponseFactory).create(response)
                }
            }
            return response;
        })
    )

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
    } = {}) {
        this.compress = init.compress ?? false;
        this.highWaterMark = init.highWaterMark ?? 16384;
        this.insecureParser = init.insecureParser ?? false;
        this.referrerPolicy = init.referrerPolicy ?? '';
    }
}

const REQUEST_STAUTS = new ContextToken(() => new RequestStauts())


export const responseFinallInterceptorFn: RequestInterceptorFn = (req, next, context) => {
    return next(req, context).pipe(
        mergeMap(async (input) => {

            const headerAdapter = context.get(HeaderAdapter);
            const streamAdapter = context.get(StreamAdapter);
            const statusAdapter = context.get(StatusAdapter);

            let responseType = req.responseType;

            const contentType = headerAdapter.getContentType(input);
            if (contentType && !req.forceJson && responseType === 'json') {
                const mimeAdapter = context.get(MimeAdapter);
                if (mimeAdapter && !mimeAdapter.isJson(contentType)) {
                    if (mimeAdapter.isXml(contentType) || mimeAdapter.isText(contentType)) {
                        responseType = 'text';
                    } else {
                        responseType = 'blob';
                    }
                } else if (!mimeAdapter && !jsonType.test(contentType)) {
                    if (xmlType.test(contentType) || textType.test(contentType)) {
                        responseType = 'text';
                    } else {
                        responseType = 'blob';
                    }
                }
            }

            let body, originalBody;
            body = originalBody = input.body;

            if (responseType !== 'stream' && streamAdapter.isReadable(body)) {
                body = streamAdapter.read(body);
            }

            let error = input.error;
            let ok = statusAdapter?.isOk(input.status ?? input.statusCode) ?? input.ok ?? !error;
            if (!isNil(body)) {
                switch (responseType) {
                    case 'json':
                        // Save the original body, before attempting XSSI prefix stripping.
                        if (Buffer.isBuffer(body)) {
                            body = context.get(TEXT_DECODER).decode(body);
                        }
                        if (isString(body)) {
                            originalBody = body;
                            try {
                                body = body.replace(XSSI_PREFIX, '');
                                // Attempt the parse. If it fails, a parse error should be delivered to the user.
                                body = (body !== '') ? JSON.parse(body) : null;
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
                        }
                        break;

                    case 'arraybuffer':
                        body = body.subarray(body.byteOffset, body.byteOffset + body.byteLength);
                        break;

                    case 'blob':
                        body = new Blob([body.subarray(body.byteOffset, body.byteOffset + body.byteLength)], {
                            type: headerAdapter.getContentType(input)
                        });
                        break;

                    case 'stream':
                        body = streamAdapter.isStream(body) ? body : streamAdapter.jsonSreamify(body);
                        break;

                    case 'text':
                    default:
                        if (Buffer.isBuffer(body)) {
                            body = context.get(TEXT_DECODER).decode(body);
                        }
                        break;

                }
            }

            if (ok) {
                input.ok = ok;
                input.body = body;
            } else {
                input.ok = ok;
                input.body = body;
                input.error = error;
            }

            return context.get(ResponseFactory).create(input);
        })
    )
}

const jsonType = /json/i;
const textType = /^text/i;
const xmlType = /xml$/i;
