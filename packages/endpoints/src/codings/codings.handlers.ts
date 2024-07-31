import { Injectable } from '@tsdi/ioc';
import { DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { IncomingPacket, NotImplementedExecption, OutgoingPacket, TransportContext } from '@tsdi/common/transport';
import { RequestContext } from '../RequestContext';
import { TransportSession } from '../transport.session';




@Injectable({ static: true })
export class ServerEndpointCodingsHanlders {

    @DecodeHandler(IncomingPacket)
    decodePacket(context: TransportContext) {
        const incoming = context.last<IncomingPacket<any>>();
        const session = context.session as TransportSession;
        if (!session.outgoingFactory) throw new NotImplementedExecption('outgoingFactory');
        const outgoing = session.outgoingFactory.create(incoming);

        return session.requestContextFactory.create(session, incoming, outgoing, session.serverOptions);
    }

    @EncodeHandler(RequestContext)
    encodePacket(context: TransportContext) {
        const reqContext = context.last<RequestContext>();
        return (reqContext.response as OutgoingPacket<any>).clone({ payload: reqContext.body });

    }
}
