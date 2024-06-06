import { Injectable, tokenId } from '@tsdi/ioc';
import { ExecptionHandler, Interceptor } from '@tsdi/core';
import { Codings, CodingsNotHandleExecption, DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { IncomingPacket, OutgoingFactory, OutgoingPacket, TransportContext } from '@tsdi/common/transport';
import { RequestContext, RequestContextFactory } from '../RequestContext';
import { TransportSession } from '../transport.session';
export const SERVER_INCOMING_DECODE_INTERCEPTORS = tokenId<Interceptor<IncomingPacket, RequestContext, TransportContext>[]>('SERVER_INCOMING_DECODE_INTERCEPTORS');


export const SERVER_OUTGOING_ENCODE_INTERCEPTORS = tokenId<Interceptor<RequestContext, OutgoingPacket, TransportContext>[]>('SERVER_OUTGOING_ENCODE_INTERCEPTORS');



@Injectable()
export class ServerEndpointCodingsHanlders {

    constructor(private codings: Codings) {

    }

    @DecodeHandler(IncomingPacket, { interceptorsToken: SERVER_INCOMING_DECODE_INTERCEPTORS })
    decodePacket(context: TransportContext) {
        const incoming = context.last<IncomingPacket>();
        const session = context.session as TransportSession;
        const injector = session.injector;
        const outgoing = injector.get(OutgoingFactory).create(incoming, { headerFields: incoming.headers.headerFields });

        return injector.get(RequestContextFactory).create(session, incoming, outgoing, session.serverOptions);

    }

    @EncodeHandler(RequestContext, { interceptorsToken: SERVER_OUTGOING_ENCODE_INTERCEPTORS })
    encodePacket(context: TransportContext) {
        const reqContext = context.last<RequestContext>();
        return (reqContext.response as OutgoingPacket).clone({ payload: reqContext.body });
    }


    @ExecptionHandler(CodingsNotHandleExecption)
    noHandleContext(execption: CodingsNotHandleExecption) {
        if (execption.target instanceof RequestContext && execption.target.response instanceof OutgoingPacket) {
            return this.codings.encodeType(RequestContext, execption.target, execption.codingsContext);
        }
    }

}
