import { Injectable } from '@tsdi/ioc';
import { PacketOpts } from '@tsdi/common';
import { DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { PayloadEncoder, TransportContext } from '@tsdi/common/transport';
import { TransportSession } from '@tsdi/endpoints';
import { HttpIncomings } from './transport';
import { HttpContext } from './context';


@Injectable({ static: true })
export class HttpCodingsHandlers {

    constructor(private payloadEncoder: PayloadEncoder) { }

    @DecodeHandler(HttpIncomings)
    handleIncoming(incoming: HttpIncomings, context: TransportContext) {
        const session = context.session as TransportSession;
        return session.requestContextFactory.create(session, incoming.req, incoming.res, session.serverOptions)
    }


    @EncodeHandler(HttpContext)
    async handleContext(input: HttpContext, context: TransportContext) {
        const session = context.session as TransportSession;
        const response = input.response;

        const data = await this.payloadEncoder.encode(session.streamAdapter, session.headerAdapter, input.body, input.response.headers ?? input.response, session.options.encoding);
        const packet = {
            url: input.url,
            id: response.id,
            type: response.type,
            status: response.statusCode,
            statusMessage: response.statusMessage,
            headers: input.response?.getHeaders() ?? input.response.headers,
            data
        } as PacketOpts;

        // return packet;
        return session.messageFactory?.create(packet)
    }

}
