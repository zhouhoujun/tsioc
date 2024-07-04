import { Injectable } from '@tsdi/ioc';
import { HttpStatusCode, PacketOpts, PatternFormatter, statusMessage } from '@tsdi/common';
import { DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { TransportContext, StatusAdapter } from '@tsdi/common/transport';
import { HttpRequest } from '@tsdi/common/http';
import { IncomingMessage } from 'http';
import { Http2IncomingMessage } from './client.session';



@Injectable({ static: true })
export class HttpClientCodingsHandlers {

    @DecodeHandler(IncomingMessage)
    handleHttpMessage(message: IncomingMessage, context: TransportContext, statusAdapter: StatusAdapter) {
        const msg = new ClientIncomingPacket({
            status: message.statusCode,
            statusMessage: message.statusMessage,
            headers: message.headers,
            ok: statusAdapter.isOk(message.statusCode),
            payload: message
        }, context.options)

        
        // return this.codings.decode(msg, context);
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
    handleRequest(req: HttpRequest<any>) {
        return req;
    }


}