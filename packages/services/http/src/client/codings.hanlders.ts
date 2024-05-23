import { Injectable } from '@tsdi/ioc';
import { HttpStatusCode, PatternFormatter, statusMessage } from '@tsdi/common';
import { Codings, DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { TransportContext, PacketData, ResponsePacketIncoming, StatusAdapter } from '@tsdi/common/transport';
import { HttpRequest } from '@tsdi/common/http';
import { IncomingMessage } from 'http';
import { Http2IncomingMessage } from './client.session';



@Injectable({ static: true })
export class HttpClientCodingsHandlers {

    constructor(private codings: Codings) { }

    @DecodeHandler(IncomingMessage, {group: 'http' })
    handleHttpMessage(message: IncomingMessage, context: TransportContext, statusAdapter: StatusAdapter) {
        const msg = new ResponsePacketIncoming({
            status: message.statusCode,
            statusMessage: message.statusMessage,
            headers: message.headers,
            ok: statusAdapter.isOk(message.statusCode),
            payload: message
        }, context.options)
        return this.codings.decode(msg, context);
    }

    @DecodeHandler(Http2IncomingMessage)
    handleHttp2Message(message: Http2IncomingMessage, context: TransportContext, statusAdapter: StatusAdapter) {
        const status = message.headers[':status'] as HttpStatusCode;
        const msg = new ResponsePacketIncoming({
            status,
            statusMessage: statusMessage[status],
            headers: message.headers,
            ok: statusAdapter.isOk(status),
            payload: message
        }, context.options)
        return this.codings.decode(msg, context);
    }


    @EncodeHandler(HttpRequest)
    handleRequest(req: HttpRequest) {
        const packet = {
            url: req.urlWithParams,
            headers: req.headers,
            payload: req.payload,
            method: req.method ?? 'GET',
            payloadLength: req.headers.getContentLength()
        } as PacketData;
        if (!packet.url && req.pattern) {
            packet.url = req.context.get(PatternFormatter).format(req.pattern);
        }
        
    }


}