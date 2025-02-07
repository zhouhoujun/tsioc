import { Injectable, isNil, isString, lang } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { HEAD, ResponseEvent, ResponseJsonParseError, AbstractRequest, UrlRequest } from '@tsdi/common';
import { MimeAdapter, XSSI_PREFIX, ev, isBuffer, toBuffer, ClientIncoming, TransportContext, TransferOpts, AbstractTransferFactory } from '@tsdi/common/transport';
import { Observable, defer, mergeMap, of, throwError } from 'rxjs';
import { ClientTransport } from './transport';
import { ClientTransfer, ClientTransferFactory } from './transfer';


@Injectable()
export class ErrorResponseInterceptor implements Interceptor<ClientIncoming<any>, ResponseEvent<any>, TransportContext> {

    intercept(input: ClientIncoming<any>, next: Handler<ClientIncoming<any>, ResponseEvent<any>, TransportContext>, context: TransportContext): Observable<ResponseEvent<any>> {
        if (!(input.ok || (context.transport.statusAdapter ? context.transport.statusAdapter.isOk(input.status ?? input.statusCode) : true)) || input.error) {
            const transport = context.transport as ClientTransport;
            input.ok = false;
            return defer(async () => {
                if (transport.streamAdapter.isReadable(input.body)) {
                    let body: any = await toBuffer(input.body);
                    body = new TextDecoder().decode(body);
                    input.body = body;
                }
                return input;
            }).pipe(
                mergeMap(input => throwError(() => transport.responseFactory.create(input)))
            );
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class EmptyResponseInterceptor implements Interceptor<ClientIncoming<any>, ResponseEvent<any>, TransportContext> {

    intercept(input: ClientIncoming<any>, next: Handler<ClientIncoming<any>, ResponseEvent<any>, TransportContext>, context: TransportContext): Observable<ResponseEvent<any>> {
        const len = context.transport.headerAdapter?.getContentLength(input.headers);
        const transport = context.transport as ClientTransport;
        if (input.ok !== false && !input.error && (!len || transport.statusAdapter?.isEmpty(input.status ?? input.statusCode))) {
            input.body = null;
            return of(transport.responseFactory.create(input));
        }
        return next.handle(input, context);
    }
}

@Injectable()
export class RedirectInterceptor implements Interceptor<ClientIncoming<any>, ResponseEvent<any>, TransportContext> {

    intercept(input: ClientIncoming<any>, next: Handler<ClientIncoming<any>, ResponseEvent<any>, TransportContext>, context: TransportContext): Observable<ResponseEvent<any>> {
        const transport = context.transport as ClientTransport;
        // HTTP fetch step 5
        if (transport.redirector) {
            if (transport.statusAdapter?.isRedirect(input.status ?? input.statusCode)) {
                // HTTP fetch step 5.2
                return transport.redirector.redirect<ResponseEvent<any>>(context.first(), input.status ?? input.statusCode, input.headers, context.transport.protocol);
            }
        }
        return next.handle(input, context);

    }
}


@Injectable()
export class CompressResponseInterceptor implements Interceptor<ClientIncoming<any>, ResponseEvent<any>, TransportContext> {


    intercept(input: ClientIncoming<any>, next: Handler<ClientIncoming<any>, ResponseEvent<any>, TransportContext>, context: TransportContext): Observable<ResponseEvent<any>> {
        return defer(async () => {
            const response = input;
            const transport = context.transport as ClientTransport;
            const codings = transport.headerAdapter?.getContentEncoding(response.headers);
            const req = context.first() as AbstractRequest<any>;
            const streamAdapter = transport.streamAdapter;
            const rqstatus = req.context.getValueify(RequestStauts, () => new RequestStauts());
            // HTTP-network fetch step 12.1.1.4: handle content codings
            // in following scenarios we ignore compression support
            // 1. compression support is disabled
            // 2. HEAD request
            // 3. no Content-Encoding header
            // 4. no content response (204)
            // 5. content not modified response (304)
            if (rqstatus.compress && (req as UrlRequest).method !== HEAD && codings) {

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
                    response.body = body;
                    return response

                } catch (err) {
                    response.error = err;
                    throw transport.responseFactory.create(response)
                }
            }
            return response;
        }).pipe(
            mergeMap(event => next.handle(event, context))
        )

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
    } = {}) {
        this.compress = init.compress ?? false;
        this.highWaterMark = init.highWaterMark ?? 16384;
        this.insecureParser = init.insecureParser ?? false;
        this.referrerPolicy = init.referrerPolicy ?? '';
    }
}


const backenFn = (input: ClientIncoming<any>, context: TransportContext) => {
    return defer(async () => {
        const { responseFactory, headerAdapter, streamAdapter, statusAdapter } = context.transport as ClientTransport;

        const req = context.first() as AbstractRequest<any>;
        let responseType = req.responseType;

        const contentType = headerAdapter?.getContentType(input.headers);
        if (contentType && !req.forceJson && responseType === 'json') {
            const mimeAdapter = req.context.get(MimeAdapter);
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
            body = await toBuffer(body);
        }

        let error = input.error;
        let ok = statusAdapter?.isOk(input.status ?? input.statusCode) ?? input.ok ?? !error;
        if (!isNil(body)) {
            switch (responseType) {
                case 'json':
                    // Save the original body, before attempting XSSI prefix stripping.
                    if (isBuffer(body)) {
                        body = new TextDecoder().decode(body);
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
                        type: headerAdapter?.getContentType(input.headers)
                    });
                    break;

                case 'stream':
                    body = streamAdapter.isStream(body) ? body : streamAdapter.jsonSreamify(body);
                    break;

                case 'text':
                default:
                    if (isBuffer(body)) {
                        body = new TextDecoder().decode(body);
                    }
                    break;

            }
        }

        if (ok) {
            input.ok = ok;
            input.body = body;
            return responseFactory.create(input);
        } else {
            input.ok = ok;
            input.body = body;
            input.error = error;
            throw responseFactory.create(input);
        }

    })
}

const jsonType = /json/i;
const textType = /^text/i;
const xmlType = /xml$/i;

export const RESPONSE_TRANSFER_INTERCEPTORS = [
    EmptyResponseInterceptor,
    ErrorResponseInterceptor,
];

export const STATUS_RESPONSE_TRANSFER_INTERCEPTORS = [
    RedirectInterceptor,
    EmptyResponseInterceptor,
    ErrorResponseInterceptor,
    CompressResponseInterceptor,
];

@Injectable()
export class DefaultClientTransferFactory extends AbstractTransferFactory<ClientIncoming, ResponseEvent<any>, ClientTransfer> implements ClientTransferFactory {

    protected override vaildOptions(options?: TransferOpts): TransferOpts<ClientIncoming<any, any>> {
        return {
            enableTypeChain: true,
            backend: backenFn,
            ...options
        }
    }

    protected override createInstace(handler: Handler): ClientTransfer {
        return new ClientTransfer(handler);
    }
}