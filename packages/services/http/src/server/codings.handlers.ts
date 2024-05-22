import { Injectable } from '@tsdi/ioc';
import { CodingsContext, DecodeHandler, EncodeHandler, Packet } from '@tsdi/common/transport';
import { HttpIncomings, HttpServerTransportSession } from './http.session';
import { HttpContextFactory, HttpContext } from './context';


@Injectable({ static: true })
export class HttpCodingsHandlers {

    @DecodeHandler(HttpIncomings, { transport: 'http' })
    handleIncoming(incoming: HttpIncomings, context: CodingsContext) {
        const session = context.session as HttpServerTransportSession;
        const injector = session.injector;
        return injector.get(HttpContextFactory).create(injector, session, incoming.req, incoming.res, session.serverOptions)
    }


    @EncodeHandler(HttpContext, { transport: 'http' })
    handleContext(input: HttpContext) {
        const response = input.response;
        const packet = {
            id: response.id,
            type: response.type,
            status: response.statusCode,
            statusMessage: response.statusMessage,
            headers: response.headers
        } as Packet;
        if (response.error) {
            packet.error = response.error;
        }
        if (response.tHeaders.hasContentLength()) {
            packet.payload = input.body;
        }
        return packet;
    }

}
