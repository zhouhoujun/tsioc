import {
    TransportEvent, ResHeaders, TransportErrorResponse, Packet, Incoming, Encoder, Decoder,
    TransportHeaderResponse, TransportRequest, TransportResponse, Redirector, TransportSessionFactory, Subscriber, Publisher, TimeoutExecption
} from '@tsdi/core';
import { Execption, InjectFlags, Injectable, Optional, isString } from '@tsdi/ioc';
import { StreamAdapter, ev, hdr, MimeTypes, StatusVaildator, MimeAdapter, RequestAdapter, StatusPacket, ctype } from '@tsdi/transport';
import { Observable, Observer } from 'rxjs';
import { NumberAllocator } from 'number-allocator';
import { REDIS_CLIENT_OPTS } from './options';

@Injectable()
export class RedisRequestAdapter extends RequestAdapter<TransportRequest, TransportEvent, number | string> {

    allocator = new NumberAllocator(1, 65536);
    last?: number;
    subs: Set<string>;

    constructor(
        readonly mimeTypes: MimeTypes,
        readonly vaildator: StatusVaildator<number | string>,
        readonly streamAdapter: StreamAdapter,
        readonly mimeAdapter: MimeAdapter,
        @Optional() readonly redirector: Redirector<number | string>,
        @Optional() readonly encoder: Encoder,
        @Optional() readonly decoder: Decoder) {
        super()
        this.subs = new Set();
    }

    send(req: TransportRequest): Observable<TransportEvent> {
        return new Observable((observer: Observer<TransportEvent>) => {
            const url = req.url;
            let status: number | string;
            let statusText: string | undefined;

            const context = req.context;
            const subscriber = context.get(Subscriber, InjectFlags.Self);
            const publisher = context.get(Publisher, InjectFlags.Self);
            const opts = context.get(REDIS_CLIENT_OPTS);

            const reply = req.observe === 'events' ? url : url + '.reply';
            if (!this.subs.has(reply)) {
                this.subs.add(reply);
                subscriber.subscribe(reply);
            }

            const request = context.get(TransportSessionFactory).create({
                subscriber,
                publisher
            }, opts.transportOpts);

            const onError = (error?: Error | null) => {
                const res = this.createErrorResponse({
                    url,
                    error,
                    statusText: 'Unknown Error',
                    status
                });
                observer.error(res)
            };

            const id = this.getPacketId();
            const onMessage = async (channel: string, res: any) => {
                if (channel !== reply) return;

                res = isString(res) ? JSON.parse(res) : res;
                if (res.id !== id) return;
                const headers = this.parseHeaders(res);
                const pkg = this.parsePacket(res, headers);
                status = pkg.status ?? 200;
                statusText = pkg.statusText ?? 'OK';
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
            };

            request.on(ev.MESSAGE, onMessage);
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

            if(opts.timeout){
                setTimeout(()=>{
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
                request.off(ev.MESSAGE, onMessage);
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

    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | undefined; status: number | string; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
        return new TransportErrorResponse(options);
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
        return new TransportHeaderResponse(options);
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; }): TransportEvent {
        return new TransportResponse(options);
    }
    getResponseEvenName(): string {
        return ev.RESPONSE
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

    protected getPacketId() {
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }
}

