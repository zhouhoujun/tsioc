import {
    TransportEvent, TransportRequest, Incoming, HEAD, IDuplexStream, ResHeaders, TransportErrorResponse,
    TransportHeaderResponse, TransportResponse, IEndable, IncomingHeaders, OutgoingHeaders, IReadableStream
} from '@tsdi/core';
import { Abstract, EMPTY_OBJ, isNil, lang } from '@tsdi/ioc';
import { Observable, Observer } from 'rxjs';
import { isBuffer, toBuffer } from '../utils';
import { ev, hdr } from '../consts';
import { RequestAdapter } from './request';


/**
 * stream request adapter.
 */
@Abstract()
export abstract class StreamRequestAdapter<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> extends RequestAdapter<TRequest, TResponse, TStatus> {
    /**
     * create request stream by req.
     * @param url request url with params.
     * @param req 
     */
    protected abstract createRequest(url: string, req: TRequest): IEndable;

    /**
     * send request.
     * @param request 
     * @param req 
     * @param callback 
     */
    send(req: TRequest): Observable<TResponse> {
        return new Observable((observer: Observer<TResponse>) => {
            const url = req.urlWithParams.trim();
            let status: TStatus;
            let statusText: string | undefined;

            let error: any;
            let ok = false;

            const request = this.createRequest(url, req);

            const onError = (error?: any) => {
                const res = this.createErrorResponse({
                    url,
                    error,
                    statusText: 'Unknown Error',
                    status: error?.status ?? error?.statusCode ?? status
                });
                observer.error(res)
            };

            const onResponse = this.hasResponse(req) ? async (incoming: Incoming) => {
                let body: any;
                const packet = this.parseStatusPacket(incoming);
                const headers = this.parseHeaders(packet.headers, incoming);
                body = packet.body ?? packet.payload ?? null;
                status = packet.status;
                statusText = packet.statusText;

                if (this.vaildator.isEmpty(status)) {
                    body = null;
                    observer.next(this.createResponse({
                        url,
                        headers,
                        status,
                        body
                    }));
                    observer.complete();
                    return;
                }

                // HTTP fetch step 5
                if (isNil(body)) {
                    body = this.pipeline(this.streamAdapter.isReadable(incoming) ? incoming : request as IDuplexStream, (err) => {
                        error = err;
                        ok = !err;
                    });
                }

                if (this.vaildator.isRedirect(status)) {
                    // HTTP fetch step 5.2
                    this.redirector?.redirect<TResponse>(req, status, headers).subscribe(observer);
                    return;
                }
                ok = this.vaildator.isOk(status);

                if (!ok) {
                    if (!error) {
                        if (this.streamAdapter.isReadable(body)) {
                            body = await toBuffer(body);
                        }
                        if (isBuffer(body)) {
                            body = new TextDecoder().decode(body);
                        }
                    }
                    return observer.error(this.createErrorResponse({
                        url,
                        error: error ?? body,
                        status,
                        statusText
                    }));
                }

                const rqstatus = req.context.getValueify(RequestStauts, () => new RequestStauts());
                // HTTP-network fetch step 12.1.1.3
                const codings = headers.get(hdr.CONTENT_ENCODING);

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
                    const constants = this.streamAdapter.getZipConstants();
                    const zlibOptions = {
                        flush: constants.Z_SYNC_FLUSH,
                        finishFlush: constants.Z_SYNC_FLUSH
                    };

                    try {
                        if (codings === 'gzip' || codings === 'x-gzip') { // For gzip
                            const unzip = this.streamAdapter.gunzip(zlibOptions);
                            await this.streamAdapter.pipeTo(body, unzip);
                            body = unzip;
                        } else if (codings === 'deflate' || codings === 'x-deflate') { // For deflate
                            // Handle the infamous raw deflate response from old servers
                            // a hack for old IIS and Apache servers
                            const raw = this.streamAdapter.passThrough();
                            await this.streamAdapter.pipeTo(body, raw);
                            const defer = lang.defer();
                            raw.on(ev.DATA, chunk => {
                                if ((chunk[0] & 0x0F) === 0x08) {
                                    body = this.streamAdapter.pipeline(body, this.streamAdapter.inflate(), err => {
                                        if (err) {
                                            defer.reject(err);
                                        }
                                    });
                                } else {
                                    body = this.streamAdapter.pipeline(body, this.streamAdapter.inflateRaw(), err => {
                                        if (err) {
                                            defer.reject(err);
                                        }
                                    });
                                }
                            });

                            raw.once(ev.END, defer.resolve);

                            await defer.promise;

                        } else if (codings === 'br') { // For br
                            const unBr = this.streamAdapter.brotliDecompress();
                            await this.streamAdapter.pipeTo(body, unBr);
                            body = unBr;
                        }
                    } catch (err) {
                        ok = false;
                        error = err;
                    }
                }

                const [success, res] = await this.parseResponse(url, body, headers, status, statusText, req.responseType);
                if (success) {
                    observer.next(res);
                    observer.complete()
                } else {
                    observer.error(res);
                }
            } : null;


            const respEventName = this.getResponseEvenName();
            onResponse && request.on(respEventName, onResponse);

            request.on(ev.ERROR, onError);
            request.on(ev.ABOUT, onError);
            request.on(ev.ABORTED, onError);
            request.on(ev.TIMEOUT, onError);

            this.write(request, req, (err) => {
                if (err) {
                    onError(err);
                } else if (req.observe === 'emit') {
                    observer.next(this.createResponse({
                        url,
                        status: this.vaildator.ok,
                        statusText: 'OK',
                        body: true
                    }))
                    observer.complete();
                }
            });


            return () => {
                onResponse && request.off(respEventName, onResponse);
                request.off(ev.ERROR, onError);
                request.off(ev.ABOUT, onError);
                request.off(ev.ABORTED, onError);
                request.off(ev.TIMEOUT, onError);
            }
        });
    }

    protected pipeline(stream: IReadableStream, err: (err: any) => void) {
        return this.streamAdapter.pipeline(stream, this.streamAdapter.passThrough(), err);
    }

    hasResponse(req: TRequest) {
        return req.observe !== 'emit'
    }

    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | undefined; status: TStatus; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse {
        return new TransportErrorResponse(options) as TResponse;
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: TStatus; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse {
        return new TransportHeaderResponse(options) as TResponse;
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: TStatus; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; }): TResponse {
        return new TransportResponse(options) as TResponse;
    }


    /**
     * response event of request stream.
     */
    protected abstract getResponseEvenName(): string;

    protected parseHeaders(headers: IncomingHeaders | OutgoingHeaders, incoming?: Incoming): ResHeaders {
        return new ResHeaders(headers ?? incoming?.headers);
    }

    protected getPayload(req: TRequest) {
        return req.body;
    }
    /**
     * write request stream.
     * @param request 
     * @param req 
     * @param callback 
     */
    protected write(request: IEndable, req: TRequest, callback: (error?: Error | null) => void): void {
        const data = this.getPayload(req);
        if (data === null) {
            request.end(callback);
        } else {
            this.streamAdapter.sendbody(
                this.encoder ? this.encoder.encode(data) : data,
                request,
                (err?) => callback(err),
                req.headers.get(hdr.CONTENT_ENCODING) as string);
        }
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

