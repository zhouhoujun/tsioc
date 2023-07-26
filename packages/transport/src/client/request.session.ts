import { Execption, Abstract, isString, InvocationContext, InjectFlags } from '@tsdi/ioc';
import {
    TransportEvent, TransportErrorResponse, Packet, TransportHeaderResponse, TransportRequest, TransportResponse,
    IncomingHeaders, OutgoingHeaders, ResHeaders, InvalidJsonException, RequestTimeoutExecption
} from '@tsdi/common';
import { Observable, Observer } from 'rxjs';
import { NumberAllocator } from 'number-allocator';
import { RequestAdapter, StatusPacket } from './request';
import { ctype, ev, hdr } from '../consts';
import { Incoming } from '../socket';
import { TRANSPORT_SESSION, TransportSession } from '../TransportSession';

@Abstract()
export abstract class SessionRequestAdapter<T = any, Option = any> extends RequestAdapter<TransportRequest, TransportEvent, number | string> {

    allocator?: NumberAllocator;
    last?: number;

    send(req: TransportRequest): Observable<TransportEvent> {
        return new Observable((observer: Observer<TransportEvent>) => {
            const url = this.getReqUrl(req);

            const opts = this.getClientOpts(req) as Option & Record<string, any>;
            const request = this.getSession(req.context);

            const onError = (error?: any) => {
                const res = this.createErrorResponse({
                    url,
                    error,
                    statusText: 'Unknown Error',
                    status: error?.status ?? error?.statusCode ?? 0
                });
                observer.error(res)
            };

            const id = this.getPacketId();

            const packet = this.toPacket(id, url, req);
            const [message, onMessage] = this.bindMessageEvent(request, packet, req, observer, opts);

            request.on(ev.ERROR, onError);
            request.on(ev.CLOSE, onError);
            request.on(ev.ABOUT, onError);
            request.on(ev.ABORTED, onError);


            let timeout: any;
            const observe = req.observe;
            request.send(packet, { observe })
                .then(() => {
                    if (!message) {
                        observer.next(this.createResponse({
                            url,
                            status: this.vaildator.ok,
                            statusText: 'OK',
                            body: true
                        }));
                        observer.complete();
                    } else if (req.timeout || opts.timeout) {
                        timeout = setTimeout(() => {
                            clearTimeout(timeout);
                            const error = new RequestTimeoutExecption();
                            const res = this.createErrorResponse({
                                url,
                                error,
                                statusText: error.message,
                                status: this.vaildator.gatewayTimeout
                            });
                            observer.error(res);
                        }, req.timeout || opts.timeout)
                    }
                })
                .catch(err => {
                    observer.error(this.createErrorResponse({
                        url,
                        status: err.status ?? err.statusCode ?? this.vaildator.none,
                        error: err,
                        statusText: err.message
                    }));
                });


            return () => {
                timeout && clearTimeout(timeout);
                message && onMessage && request.off(message, onMessage);
                request.off(ev.ERROR, onError);
                request.off(ev.CLOSE, onError);
                request.off(ev.ABOUT, onError);
                request.off(ev.ABORTED, onError);
            }
        });
    }

    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | undefined; status: number | string; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
        return new TransportErrorResponse(options);
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
        return new TransportHeaderResponse(options);
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; }): TransportEvent {
        return new TransportResponse(options);
    }

    protected getReqUrl(req: TransportRequest) {
        return req.url;
    }

    protected toPacket(id: number | string, url: string, req: TransportRequest) {
        const pkg = {
            id,
            method: req.method,
            headers: {
                'accept': ctype.REQUEST_ACCEPT,
                ...req.headers.getHeaders()
            },
            url,
            payload: req.body
        } as Packet;

        const replyTo = this.getReply(url, req.observe);
        if (replyTo) {
            pkg.replyTo = replyTo;
        }

        return pkg;
    }

    protected getSession(context: InvocationContext): TransportSession<T> {
        return context.get(TRANSPORT_SESSION, InjectFlags.Self)
    }

    protected abstract getClientOpts(req: TransportRequest): Option;

    protected abstract bindMessageEvent(session: TransportSession<T>, packet: Packet, req: TransportRequest, observer: Observer<TransportEvent>, opts: Option): [string, (...args: any[]) => void]

    protected getReply(url: string, observe: 'body' | 'events' | 'response' | 'emit'): string {
        switch (observe) {
            case 'emit':
                return '';
            default:
                return url + '/reply'
        }
    }

    protected async handleMessage(id: number | string, url: string, req: TransportRequest, observer: Observer<TransportEvent>, res: any) {
        res = isString(res) ? this.deserialize(res) : res;
        if (res.id != id) return;
        const { status, headers: inHeaders, statusText, body: resbody, payload } = this.parseStatusPacket(res);
        const headers = this.parseHeaders(inHeaders, res);
        let body = resbody ?? payload ?? null;

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

        if (this.vaildator.isRedirect(status)) {
            // fetch step 5.2
            this.redirector?.redirect<TransportEvent>(req, status, headers).subscribe(observer);
            return;
        }
        const [ok, result] = await this.parseResponse(url, body, headers, status, statusText, req.responseType);

        if (ok) {
            observer.next(result);
            observer.complete();
        } else {
            observer.error(result);
        }

    }

    protected deserialize(msg: string) {
        try {
            return JSON.parse(msg);
        } catch (err) {
            throw new InvalidJsonException(err, msg);

        }
    }

    protected parseHeaders(headers: IncomingHeaders | OutgoingHeaders, incoming?: Incoming): ResHeaders {
        return new ResHeaders(headers ?? incoming?.headers);
    }

    protected parseStatusPacket(incoming: Incoming): StatusPacket<number | string> {
        return {
            headers: incoming.headers,
            status: incoming.headers[hdr.STATUS] ?? this.vaildator.none,
            statusText: String(incoming.headers[hdr.STATUS_MESSAGE]) ?? '',
            body: incoming.body,
            payload: incoming.payload
        }
    }

    protected getPacketId(): string | number {
        if (!this.allocator) {
            this.allocator = new NumberAllocator(1, 65536)
        }
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }
}

