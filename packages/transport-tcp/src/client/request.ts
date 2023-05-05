import {
    ClientStreamFactory, TransportEvent, ResHeaders, ResponsePacket, SOCKET, Socket, TransportErrorResponse,
    Incoming, TransportHeaderResponse, TransportRequest, TransportResponse, IWritableStream, Redirector, Encoder, Decoder
} from '@tsdi/core';
import { InjectFlags, Injectable, Nullable } from '@tsdi/ioc';
import { StreamRequestAdapter, StreamAdapter, ev, hdr, MimeTypes, StatusVaildator, MimeAdapter } from '@tsdi/transport';
import { TCP_CLIENT_OPTS } from './options';


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
