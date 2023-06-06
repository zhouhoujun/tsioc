import { Decoder, Encoder, IWritableStream, Incoming, Redirector, ResHeaders, TransportErrorResponse, TransportHeaderResponse, TransportRequest, TransportResponse } from '@tsdi/core';
import { Injectable, Optional } from '@tsdi/ioc';
import { MimeAdapter, MimeTypes, StatusPacket, StatusVaildator, StreamAdapter, RequestAdapter, hdr } from '@tsdi/transport';
import { Agent } from 'coap';
import { Observable } from 'rxjs';

@Injectable()
export class CoapRequestAdapter extends RequestAdapter<TransportRequest, TransportResponse, string> {

  

    constructor(
        readonly mimeTypes: MimeTypes,
        readonly vaildator: StatusVaildator<string>,
        readonly streamAdapter: StreamAdapter,
        readonly mimeAdapter: MimeAdapter,
        @Optional() readonly redirector: Redirector<string>,
        @Optional() readonly encoder: Encoder,
        @Optional() readonly decoder: Decoder) {
        super()
    }    
    
    
    send(req: TransportRequest<any>): Observable<TransportResponse<any, any>> {
        throw new Error('Method not implemented.');
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

    parsePacket(incoming: any, headers: ResHeaders): StatusPacket<string> {
        return {
            status: headers.get(hdr.STATUS) as string,
            statusText: String(headers.get(hdr.STATUS_MESSAGE))
        }
    }

}