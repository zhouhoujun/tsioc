import {
    TransportEvent, ResHeaders, SOCKET, TransportErrorResponse, Packet, Incoming, Encoder, Decoder,
    TransportHeaderResponse, TransportRequest, TransportResponse, Redirector, TransportSessionFactory
} from '@tsdi/core';
import { InjectFlags, Injectable, Optional } from '@tsdi/ioc';
import { StreamAdapter, ev, hdr, MimeTypes, StatusVaildator, MimeAdapter, RequestAdapter, StatusPacket } from '@tsdi/transport';
import { Observable, Observer } from 'rxjs';
import { TCP_CLIENT_OPTS } from './options';

@Injectable()
export class TcpRequestAdapter extends RequestAdapter<TransportRequest, TransportEvent, number | string> {

    constructor(
        readonly mimeTypes: MimeTypes,
        readonly vaildator: StatusVaildator<number | string>,
        readonly streamAdapter: StreamAdapter,
        readonly mimeAdapter: MimeAdapter,
        @Optional() readonly redirector: Redirector<number | string>,
        @Optional() readonly encoder: Encoder,
        @Optional() readonly decoder: Decoder) {
        super()
    }

    send(req: TransportRequest<any>): Observable<TransportEvent> {
        return new Observable((observer: Observer<TransportEvent>) => {
            const url = req.urlWithParams.trim();
            let status: number | string;
            let statusText: string | undefined;

            let error: any;
            const context = req.context;
            const socket = context.get(SOCKET, InjectFlags.Self);
            const opts = context.get(TCP_CLIENT_OPTS);
            const clientStream = context.get(TransportSessionFactory).create(socket, opts.transportSession);
            const onError = (error?: Error | null) => {
                const res = this.createErrorResponse({
                    url,
                    error,
                    statusText: 'Unknown Error',
                    status
                });
                observer.error(res)
            };
            const onResponse = (res: any) => {
                res = this.decoder ? this.decoder.decode(res) : JSON.parse(res);

                if (res.error) {
                    error = res.error;
                    observer.error(this.createErrorResponse({
                        url,
                        status,
                        statusText,
                        headers: res.headers,
                        error
                    }))
                } else {
                    observer.next(this.createResponse({
                        url,
                        status,
                        statusText,
                        headers: res.headers,
                        body: res.body ?? res.payload,
                    }));
                    observer.complete();
                }

            }
            clientStream.on(ev.MESSAGE, onResponse);
            clientStream.on(ev.ERROR, onError);
            clientStream.on(ev.CLOSE, onError);
            clientStream.on(ev.ABOUT, onError);


            const packet = {
                headers: req.headers.headers,
                url,
                payload: req.body,
            } as Packet;

            clientStream.send(packet, this.encoder);

            return () => {
                clientStream.off(ev.MESSAGE, onResponse);
                clientStream.off(ev.ERROR, onError);
                clientStream.off(ev.CLOSE, onError);
                clientStream.off(ev.ABOUT, onError);
                clientStream.destroy?.();
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
    getResponseEvenName(): string {
        return ev.RESPONSE
    }
    parseHeaders(incoming: Incoming): ResHeaders {
        return new ResHeaders(incoming.headers);
    }

    parsePacket(incoming: any, headers: ResHeaders): StatusPacket<number | string> {
        return {
            status: headers.get(hdr.STATUS) ?? '',
            statusText: String(headers.get(hdr.STATUS_MESSAGE))
        }
    }
}

