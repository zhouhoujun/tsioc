import { Injectable, tokenId } from '@tsdi/ioc';
import { Interceptor } from '@tsdi/core';
import { DecodeHandler } from '@tsdi/common/codings';
import { IncomingPacket, TransportContext } from '@tsdi/common/transport';
import { RequestContext, RequestContextFactory } from '../RequestContext';
import { TransportSession } from '../transport.session';

export const SERVER_INCOMING_DECODE_INTERCEPTORS = tokenId<Interceptor<IncomingPacket, RequestContext, TransportContext>[]>('SERVER_INCOMING_DECODE_INTERCEPTORS');


@Injectable()
export class ServerEndpointCodingsHanlders {


    @DecodeHandler(IncomingPacket, { interceptorsToken: SERVER_INCOMING_DECODE_INTERCEPTORS })
    decodePacket(context: TransportContext) {
        const incoming = context.last<IncomingPacket>();
        const session = context.session as TransportSession;
        const injector = session.injector;

        return injector.get(RequestContextFactory).create(session, incoming, null, session.serverOptions);

    }


}