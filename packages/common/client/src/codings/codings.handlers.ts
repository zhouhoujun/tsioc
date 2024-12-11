import { Injectable } from '@tsdi/ioc';
import { AbstractClientIncoming, DeserializeContext, DeserializeHandler } from '@tsdi/common/transport';
import { ClientTransport } from '../transport';


@Injectable({ static: true })
export class ClientEndpointCodingsHanlders {

    @DeserializeHandler(AbstractClientIncoming)
    decodePacket(context: DeserializeContext) {
        const incoming = context.last<AbstractClientIncoming<any>>();
        const session = context.transport as ClientTransport;
        return session.responseFactory.create(incoming);
    }

}