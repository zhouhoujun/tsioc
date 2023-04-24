import {
    Incoming, Outgoing, ReqHeaders, ResHeaders, ResponsePacket, SOCKET, TransportErrorResponse, TransportEvent,
    TransportHeaderResponse, TransportParams, TransportRequest, TransportResponse, WritableStream
} from '@tsdi/core';
import { Injectable, InvocationContext } from '@tsdi/ioc';
import { RequestAdapter, StreamAdapter, ev, hdr } from '@tsdi/transport';


@Injectable()
export class TcpRequestAdapter extends RequestAdapter<TransportRequest, TransportEvent, number | string> {

    constructor(private streamAdapter: StreamAdapter) {
        super()
    }

    update(req: TransportRequest<any>,
        update: {
            headers?: ReqHeaders | undefined;
            context?: InvocationContext<any> | undefined;
            reportProgress?: boolean | undefined;
            params?: TransportParams | undefined;
            responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | undefined;
            withCredentials?: boolean | undefined; body?: any;
            method?: string | undefined; url?: string | undefined;
            setHeaders?: { [name: string]: string | string[]; } | undefined;
            setParams?: { [param: string]: string; } | undefined;
        }
    ): TransportRequest<any> {
        return req;
    }

    createRequest(req: TransportRequest<any>): Outgoing {
       const socket = req.context.get(SOCKET);

       
    }

    send(request: WritableStream<any>, req: TransportRequest<any>, callback: (error?: Error | null | undefined) => void): void {

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
    parseStatus(incoming: any, headers: ResHeaders): ResponsePacket<number | string> {
        return {
            statusText: '',
            status: headers.get(hdr.STATUS) ?? ''
        }
    }

}