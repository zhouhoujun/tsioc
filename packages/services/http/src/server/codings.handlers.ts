import { Injectable } from '@tsdi/ioc';
import { PacketOpts } from '@tsdi/common';
import { DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { TransportContext } from '@tsdi/common/transport';
import { HttpIncomings } from './message';
import { HttpContext } from './context';
import { TransportSession } from '@tsdi/endpoints';


@Injectable({ static: true })
export class HttpCodingsHandlers {

    @DecodeHandler(HttpIncomings)
    handleIncoming(incoming: HttpIncomings, context: TransportContext) {
        const session = context.session as TransportSession;
        return session.requestContextFactory.create(session, incoming.req, incoming.res, session.serverOptions)
    }


    @EncodeHandler(HttpContext)
    handleContext(input: HttpContext) {
        const response = input.response;
        const packet = {
            id: response.id,
            type: response.type,
            status: response.statusCode,
            statusMessage: response.statusMessage,
            headers: response.headers
        } as PacketOpts;
        if (response.error) {
            packet.error = response.error;
        }
        if (input.resHeaders.hasContentLength()) {
            packet.payload = input.body;
        }
        
        return packet;
    }

}
