import {
    ClientStreamFactory, TransportEvent, ResHeaders, ResponsePacket, SOCKET, Socket, TransportErrorResponse,
    Incoming, TransportHeaderResponse, TransportRequest, TransportResponse, IWritableStream, Redirector, Encoder, Decoder, Packet
} from '@tsdi/core';
import { InjectFlags, Injectable, Nullable } from '@tsdi/ioc';
import { StreamRequestAdapter, StreamAdapter, ev, hdr, MimeTypes, StatusVaildator, MimeAdapter, RequestAdapter } from '@tsdi/transport';
import { TCP_CLIENT_OPTS } from './options';
import { Observable, Observer } from 'rxjs';

import { NumberAllocator } from 'number-allocator';


@Injectable()
export class TcpRequestAdapter extends RequestAdapter<TransportRequest, TransportEvent, number | string> {
    allocator = new NumberAllocator(1, 65536);
    constructor(
        readonly mimeTypes: MimeTypes,
        readonly vaildator: StatusVaildator<number | string>,
        readonly streamAdapter: StreamAdapter,
        readonly mimeAdapter: MimeAdapter,
        @Nullable() readonly redirector: Redirector<number | string>,
        @Nullable() readonly encoder: Encoder,
        @Nullable() readonly decoder: Decoder) {
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
            const opts = context.get(TCP_CLIENT_OPTS, InjectFlags.Self);
            const id = this.allocator.alloc();
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
                if (res.id == id) {
                    if (res.error) {
                        observer.error(this.createErrorResponse({
                            url,
                            status,
                            statusText,
                            headers: res.headers,
                            error: res.error
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
            }
            socket.on(ev.RESPONSE, onResponse);
            socket.on(ev.ERROR, onError);
            socket.on(ev.ABOUT, onError);


            const packet = {
                headers: req.headers.headers,
                url,
                payload: req.body,
            } as Packet;

            socket.emit(ev.MESSAGE, this.encoder ? this.encoder.encode(packet) : packet);

            return () => {
                socket.off(ev.RESPONSE, onResponse);
                socket.off(ev.ERROR, onError);
                socket.off(ev.ABOUT, onError);
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
    parsePacket(incoming: any, headers: ResHeaders): ResponsePacket<number | string> {
        return {
            status: headers.get(hdr.STATUS) ?? '',
            statusText: String(headers.get(hdr.STATUS_MESSAGE))
        }
    }
}

@Injectable()
export class TcpStreamRequestAdapter extends StreamRequestAdapter<TransportRequest, TransportEvent, number | string> {

    constructor(
        readonly mimeTypes: MimeTypes,
        readonly vaildator: StatusVaildator<number | string>,
        readonly streamAdapter: StreamAdapter,
        readonly mimeAdapter: MimeAdapter,
        @Nullable() readonly redirector: Redirector<number | string>,
        @Nullable() readonly encoder: Encoder,
        @Nullable() readonly decoder: Decoder) {
        super()
    }

    createRequest(req: TransportRequest<any>): IWritableStream {
        const context = req.context;
        const socket = context.get(SOCKET, InjectFlags.Self);
        const opts = context.get(TCP_CLIENT_OPTS, InjectFlags.Self);
        const factory = context.get(ClientStreamFactory<Socket>);
        return factory.create(socket, req.headers, opts);
    }

    protected write(request: IWritableStream, req: TransportRequest<any>, callback: (error?: Error | null | undefined) => void): void {
        const data = req.body;
        if (data === null) {
            request.end();
        } else {
            this.streamAdapter.sendbody(
                data,
                request,
                err => callback(err),
                req.headers.get(hdr.CONTENT_ENCODING) as string);
        }
    }

    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | undefined; status: number; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
        return new TransportErrorResponse(options);
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: number; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
        return new TransportHeaderResponse(options);
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | undefined; status: number; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; }): TransportEvent {
        return new TransportResponse(options);
    }
    getResponseEvenName(): string {
        return ev.RESPONSE
    }
    parseHeaders(incoming: Incoming): ResHeaders {
        return new ResHeaders(incoming.headers);
    }
    parsePacket(incoming: any, headers: ResHeaders): ResponsePacket<number | string> {
        return {
            status: headers.get(hdr.STATUS) ?? '',
            statusText: String(headers.get(hdr.STATUS_MESSAGE))
        }
    }

}
