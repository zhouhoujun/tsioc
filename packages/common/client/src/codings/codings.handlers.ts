import { Injectable, tokenId } from '@tsdi/ioc';
import { Interceptor } from '@tsdi/core';
import { ResponseEvent, ResponseFactory } from '@tsdi/common';
import { DecodeHandler } from '@tsdi/common/codings';
import { ClientIncomingPacket, TransportContext } from '@tsdi/common/transport';
import { ClientTransportSession } from '../session';

/**
 * client incoming decode interceptors.
 */
export const CLIENT_INCOMING_DECODE_INTERCEPTORS = tokenId<Interceptor<ClientIncomingPacket, ResponseEvent, TransportContext>[]>('CLIENT_INCOMING_DECODE_INTERCEPTORS');


@Injectable()
export class ClientEndpointCodingsHanlders {

    @DecodeHandler(ClientIncomingPacket, { interceptorsToken: CLIENT_INCOMING_DECODE_INTERCEPTORS })
    decodePacket(context: TransportContext) {
        const incoming = context.last<ClientIncomingPacket>();
        const session = context.session as ClientTransportSession;
        const injector = session.injector;

        return injector.get(ResponseFactory).create(incoming);

    }

}