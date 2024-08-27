import { Injectable } from '@tsdi/ioc';
import { DecodeHandler } from '@tsdi/common/codings';
import { AbstractClientIncoming, TransportContext } from '@tsdi/common/transport';
import { ClientTransportSession } from '../session';


@Injectable({ static: true })
export class ClientEndpointCodingsHanlders {

    @DecodeHandler(AbstractClientIncoming)
    decodePacket(context: TransportContext) {
        const incoming = context.last<AbstractClientIncoming<any>>();
        const session = context.session as ClientTransportSession;
        return session.responseFactory.create(incoming);
    }

}