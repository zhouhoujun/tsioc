import { Injectable } from '@tsdi/ioc';
import { Packet, PacketOpts } from '@tsdi/common';
import { DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { TransportContext } from '@tsdi/common/transport';
import { HttpIncomings, HttpServerTransportSession } from './http.session';
import { HttpContextFactory, HttpContext } from './context';


@Injectable({ static: true })
export class HttpCodingsHandlers {

    @DecodeHandler(HttpIncomings)
    handleIncoming(incoming: HttpIncomings, context: TransportContext) {
        const session = context.session as HttpServerTransportSession;
        const injector = session.injector;
        // const outgoing = context.session
        return injector.get(HttpContextFactory).create(injector, session, incoming.req, incoming.res, session.serverOptions)
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
        if (response.tHeaders.hasContentLength()) {
            packet.payload = input.body;
        }
        
        return packet;
    }

}
