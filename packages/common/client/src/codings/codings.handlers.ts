import { Injectable } from '@tsdi/ioc';
import { DecodeHandler } from '@tsdi/common/codings';
import { ClientIncomingPacket, TransportContext } from '@tsdi/common/transport';
import { ClientTransportSession } from '../session';


@Injectable({ static: true })
export class ClientEndpointCodingsHanlders {

    @DecodeHandler(ClientIncomingPacket)
    decodePacket(context: TransportContext) {
        const incoming = context.last<ClientIncomingPacket<any>>();
        const session = context.session as ClientTransportSession;
        return session.responseFactory.create(incoming);
    }

}