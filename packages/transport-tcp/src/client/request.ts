import {
    ClientStreamFactory, TransportEvent, ResHeaders, SOCKET, Socket, TransportErrorResponse, Packet, Incoming,
    TransportHeaderResponse, TransportRequest, TransportResponse, IWritableStream, Redirector, Encoder, Decoder
} from '@tsdi/core';
import { InjectFlags, Injectable, Nullable } from '@tsdi/ioc';
import { StreamRequestAdapter, StreamAdapter, ev, hdr, MimeTypes, StatusVaildator, MimeAdapter, RequestAdapter, StatusPacket } from '@tsdi/transport';
import { TCP_CLIENT_OPTS } from './options';
import { Observable, Observer } from 'rxjs';


@Injectable()
export class TcpRequestAdapter extends RequestAdapter<TransportRequest, TransportEvent, number | string> {

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
            const clientStream = context.get(ClientStreamFactory).create(socket, opts);
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
            clientStream.on(ev.RESPONSE, onResponse);
            clientStream.on(ev.ERROR, onError);
            clientStream.on(ev.CLOSE, onError);
            clientStream.on(ev.ABOUT, onError);


            const packet = {
                headers: req.headers.headers,
                url,
                payload: req.body,
            } as Packet;

            clientStream.write(this.encoder ? this.encoder.encode(packet) : JSON.stringify(packet));

            return () => {
                clientStream.off(ev.MESSAGE, onResponse);
                clientStream.off(ev.RESPONSE, onResponse);
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
        return factory.create(socket, {
            headers: req.headers.headers,
            ...opts
        }) as IWritableStream;
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
    parsePacket(incoming: any, headers: ResHeaders): StatusPacket<number | string> {
        return {
            status: headers.get(hdr.STATUS) ?? '',
            statusText: String(headers.get(hdr.STATUS_MESSAGE))
        }
    }

}
