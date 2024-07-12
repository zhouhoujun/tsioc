import { Injectable, tokenId } from '@tsdi/ioc';
import { Interceptor } from '@tsdi/core';
import { DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { IncomingPacket, NotImplementedExecption, OutgoingPacket, TransportContext } from '@tsdi/common/transport';
import { RequestContext } from '../RequestContext';
import { TransportSession } from '../transport.session';




export const SERVER_INCOMING_DECODE_INTERCEPTORS = tokenId<Interceptor<IncomingPacket<any>, RequestContext, TransportContext>[]>('SERVER_INCOMING_DECODE_INTERCEPTORS');


export const SERVER_OUTGOING_ENCODE_INTERCEPTORS = tokenId<Interceptor<RequestContext, OutgoingPacket<any>, TransportContext>[]>('SERVER_OUTGOING_ENCODE_INTERCEPTORS');



@Injectable({ static: true })
export class ServerEndpointCodingsHanlders {

    @DecodeHandler(IncomingPacket, { interceptorsToken: SERVER_INCOMING_DECODE_INTERCEPTORS })
    decodePacket(context: TransportContext) {
        const incoming = context.last<IncomingPacket<any>>();
        const session = context.session as TransportSession;
        if (!session.outgoingFactory) throw new NotImplementedExecption('outgoingFactory');
        const outgoing = session.outgoingFactory.create(incoming, { headerFields: incoming?.headers?.headerFields });

        return session.requestContextFactory.create(session, incoming, outgoing, session.serverOptions);
    }

    @EncodeHandler(RequestContext, { interceptorsToken: SERVER_OUTGOING_ENCODE_INTERCEPTORS })
    encodePacket(context: TransportContext) {
        const reqContext = context.last<RequestContext>();
        return (reqContext.response as OutgoingPacket<any>).clone({ payload: reqContext.body });

    }
}
