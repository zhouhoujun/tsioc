import {
    TransportEvent, ResHeaders, TransportErrorResponse, Packet, Incoming,
    TransportHeaderResponse, TransportRequest, TransportResponse, TimeoutExecption, TransportSession
} from '@tsdi/core';
import { Execption, Abstract, isString } from '@tsdi/ioc';
import { Observable, Observer } from 'rxjs';
import { NumberAllocator } from 'number-allocator';
import { RequestAdapter, StatusPacket } from './request';
import { ctype, ev, hdr } from '../consts';

@Abstract()
export abstract class SessionRequestAdapter<T = any, Option = any> extends RequestAdapter<TransportRequest, TransportEvent, number | string> {

    allocator?: NumberAllocator;
    last?: number;

    send(req: TransportRequest): Observable<TransportEvent> {
        return new Observable((observer: Observer<TransportEvent>) => {
            const url = this.getReqUrl(req);

            const opts = this.getClientOpts(req) as Option & Record<string, any>;
            const request = this.createSession(req, opts);

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

            const [message, onMessage] = this.bindMessageEvent(request, id, url, req, observer, opts);

            request.on(ev.ERROR, onError);
            request.on(ev.CLOSE, onError);
            request.on(ev.ABOUT, onError);
            request.on(ev.ABORTED, onError);

            const packet = {
                id,
                method: req.method,
                headers: {
                    'accept': ctype.REQUEST_ACCEPT,
                    ...req.headers.getHeaders()
                },
                url,
                payload: req.body,
            } as Packet;

            request.send(packet);

            if (opts.timeout) {
                setTimeout(() => {
                    const res = this.createErrorResponse({
                        url,
                        error: new TimeoutExecption(),
                        statusText: 'Not Found',
                        status: 404
                    });
                    observer.error(res);
                }, opts.timeout)
            }


            const unsub = () => {
                request.off(message, onMessage);
                request.off(ev.ERROR, onError);
                request.off(ev.CLOSE, onError);
                request.off(ev.ABOUT, onError);
                request.off(ev.ABORTED, onError);
                if (!req.context.destroyed) {
                    observer.error(this.createErrorResponse({
                        status: this.vaildator.none,
                        statusText: 'The operation was aborted.'
                    }));
                }
                request.destroy?.();
            }
            req.context?.onDestroy(unsub);
            return unsub;
        });
    }

    protected getReqUrl(req: TransportRequest) {
        return req.url;
    }

    protected toPacket(url: string, id: number, req: TransportRequest) {
        return {
            id,
            method: req.method,
            headers: {
                'accept': ctype.REQUEST_ACCEPT,
                ...req.headers.getHeaders()
            },
            url,
            payload: req.body,
        } as Packet;
    }

    protected abstract createSession(req: TransportRequest, opts: Option): TransportSession<T>;

    protected abstract getClientOpts(req: TransportRequest): Option;

    protected abstract bindMessageEvent(session: TransportSession<T>, id: number | string, url: string, req: TransportRequest, observer: Observer<TransportEvent>, opts?: Option): [string, (...args: any[]) => void]

    protected getReply(url: string, observe: 'body' | 'events' | 'response'): string {
        return observe === 'events' ? url : url + '/reply';
    }

    protected async handleMessage(id: number | string, url: string, req: TransportRequest, observer: Observer<TransportEvent>, res: any) {
        res = isString(res) ? JSON.parse(res) : res;
        if (res.id !== id) return;
        const headers = this.parseHeaders(res);
        const pkg = this.parsePacket(res, headers);
        const status = pkg.status ?? 200;
        const statusText = pkg.statusText ?? 'OK';
        const body = res.body ?? res.payload;

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

    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | undefined; status: number | string; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
        return new TransportErrorResponse(options);
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
        return new TransportHeaderResponse(options);
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; }): TransportEvent {
        return new TransportResponse(options);
    }

    parseHeaders(incoming: Incoming): ResHeaders {
        return new ResHeaders(incoming.headers);
    }

    parsePacket(incoming: any, headers: ResHeaders): StatusPacket<number | string> {
        return {
            status: headers.get(hdr.STATUS) ?? 0,
            statusText: String(headers.get(hdr.STATUS_MESSAGE))
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

