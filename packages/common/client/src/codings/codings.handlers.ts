import { Injectable } from '@tsdi/ioc';
import { DecodeHandler } from '@tsdi/common/codings';
import { AbstractClientIncoming, TransportContext } from '@tsdi/common/transport';
import { ClientTransport } from '../transport';


@Injectable({ static: true })
export class ClientEndpointCodingsHanlders {

    @DecodeHandler(AbstractClientIncoming)
    decodePacket(context: TransportContext) {
        const incoming = context.last<AbstractClientIncoming<any>>();
        const session = context.transport as ClientTransport;
        return session.responseFactory.create(incoming);
    }

}